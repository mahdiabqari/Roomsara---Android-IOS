import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Clipboard,
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  InteractionManager,
  VirtualizedList,
} from "react-native";
import io from "socket.io-client";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import "moment/locale/fa";
import { debounce } from "lodash";
import moment from "moment-jalaali";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Notes from "../----/Notes";

const screenHeight = Dimensions.get("window").height;

const API_URL = "https://roomsaraservernet.liara.run";
const { width: screenWidth, height } = Dimensions.get("window"); // عرض صفحه

const Chat = ({
  userId,
  auth,
  setShowNavbar,
  setUnread,
  setNet,
  me,
  users,
  setUsers,
  friendNotes,
  setFriendNotes,
  setLoading,
  loading,
}) => {
  const [unreadMessages, setUnreadMessages] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState();
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const inputWidth = useRef(new Animated.Value(screenWidth - 80)).current;
  const inputFlex = useRef(new Animated.Value(1)).current; // استفاده از flex به جای width
  const fadeAnim = useRef(new Animated.Value(0)).current; // انیمیشن fade دکمه
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  // انیمیشن تغییر عرض اینپوت
  useEffect(() => {
    Animated.timing(inputFlex, {
      toValue: newMessage.trim() ? 0.85 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [newMessage]);
  const offsetRef = useRef(0);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: newMessage.trim() ? 1 : 0,
        duration: 300, // انیمیشن نرم‌تر
        useNativeDriver: true,
        delay: 120,
      }),
      Animated.timing(inputWidth, {
        toValue: newMessage.trim() ? screenWidth - 140 : screenWidth - 80,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [newMessage, showContextMenu]);

  useEffect(() => {
    if (showContextMenu) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showContextMenu]);

  const socketRef = useRef(null);
  const scrollViewRef = useRef(null);

  //Back Button
  useEffect(() => {
    const handleBackPress = () => {
      if (selectedUser) {
        setSelectedUser(null);
        setShowNavbar(true);
        setNewMessage("");
        setReplyingTo("");
        return true;
      }
      return false;
    };

    // اضافه کردن لیسنر برای دکمه برگشت
    BackHandler.addEventListener("hardwareBackPress", handleBackPress);

    // پاکسازی لیسنر وقتی کامپوننت unmount می‌شود
    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    };
  }, [selectedUser]);

  const updateUserMeta = (friendId, lastMessage, timestamp) => {
    setUsers((prevUsers) => {
      const index = prevUsers.findIndex((u) => u.id === friendId);
      if (index === -1) return prevUsers;

      const updated = [...prevUsers];
      updated[index] = {
        ...updated[index],
        last_message: lastMessage,
        timestamp,
      };

      // بیار بالا
      const [user] = updated.splice(index, 1);
      return [user, ...updated];
    });
  };

  useEffect(() => {
    if (!auth || !userId) return;

    socketRef.current = io(API_URL, {
      auth: { token: auth },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.emit("join", userId);

    socketRef.current.on("connect", () => {
      console.log("Connected to socket server");
    });

    socketRef.current.on("receive_message", (data) => {
      try {
        // 1) اعتبارسنجی ورودی
        if (
          !data ||
          !data.sender_id ||
          !data.receiver_id ||
          typeof data.message !== "string"
        ) {
          console.warn("⚠️ Invalid message data received:", data);
          return;
        }

        // 2) اگر کاربران هنوز نیومدن، some صدا نزن
        const isReceiverInUsers =
          Array.isArray(users) && users.some((u) => u?.id === data.receiver_id);

        if (!isReceiverInUsers && data.receiver_id !== userId) {
          // امن: fetchData ممکنه Promise برگردونه، مهم نیست؛ فقط خطا نگیره
          try {
            fetchData();
          } catch (e) {
            console.warn("fetchData failed:", e);
          }
        }

        const isCurrentThread =
          data.sender_id === selectedUser?.id || data.sender_id === userId;

        if (isCurrentThread) {
          setMessages((prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            return [data, ...safePrev]; // پیام جدید رو میذاره بالای لیست (چون inverted داری)
          });
        } else {
          // پیام برای چت فعلی نیست → فقط کانتر unread بالا بره
          setUnreadMessages((prev) => {
            const base = prev && typeof prev === "object" ? prev : {};
            const nextCount = (base[data.sender_id] || 0) + 1;
            return { ...base, [data.sender_id]: nextCount };
          });

          // بُردن فرستنده به اول لیست (اگه بود)
          setUsers((prevUsers) => {
            const list = Array.isArray(prevUsers) ? [...prevUsers] : [];
            const idx = list.findIndex((u) => u?.id === data.sender_id);
            if (idx === -1) {
              // کاربر ناشناخته → بگیریمش از سرور، ولی اپ رو کرش نده
              try {
                fetchData();
              } catch (e) {
                console.warn("fetchData failed:", e);
              }
              return list;
            }
            const [user] = list.splice(idx, 1);
            return [user, ...list];
          });

          // متادیتا
          if (typeof updateUserMeta === "function") {
            try {
              const peerId =
                data.sender_id === userId ? data.receiver_id : data.sender_id;
              updateUserMeta(
                peerId,
                data.message,
                data.timestamp || new Date().toISOString()
              );
            } catch (e) {
              console.warn("updateUserMeta failed:", e);
            }
          }
        }
      } catch (err) {
        console.error("receive_message handler crashed:", err, data);
      }
    });

    socketRef.current.on("friend_meta_update", (data) => {
      try {
        if (!data || !data.friendId) return;

        setUsers((prevUsers) => {
          const list = Array.isArray(prevUsers) ? [...prevUsers] : [];
          const index = list.findIndex((u) => u?.id === data.friendId);
          if (index === -1) return list;

          const current = list[index] || {};
          list[index] = {
            ...current,
            last_message: data.lastMessage ?? current.last_message,
            timestamp: data.timestamp ?? current.timestamp,
          };

          // مرتب‌سازی امن با تبدیل به time
          return list.sort((a, b) => {
            const ta = new Date(a?.timestamp ?? 0).getTime();
            const tb = new Date(b?.timestamp ?? 0).getTime();
            return tb - ta;
          });
        });
      } catch (err) {
        console.error("friend_meta_update handler crashed:", err, data);
      }
    });

    socketRef.current.on("message_deleted", ({ messageId }) =>
      handleDeletedMessage(messageId)
    );

    return () => {
      socketRef.current.disconnect();
    };
  }, [auth, userId, selectedUser]);

  useEffect(() => {
    if (auth && userId) {
      fetchUnreadMessages();
    }
  }, [auth, userId]);

  const fetchUnreadMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/messages/unread/${userId}`, {
        headers: { Authorization: auth },
      });
      if (response.ok) {
        const data = await response.json();
        // فرض کنید data به شکل { senderId1: count, senderId2: count, ... } برگرده
        setUnreadMessages(data);

        // بررسی اینکه آیا پیام خوانده نشده‌ای وجود دارد یا خیر
        const hasUnreadMessages = Object.values(data).some(
          (count) => count > 0
        );
        if (!hasUnreadMessages) {
          setUnread(false);
        }
      } else {
        console.error("خطا در دریافت پیام‌های خوانده نشده");
      }
    } catch (error) {
      console.error("❌ خطا:", error);
      setNet(false);
    }
  };

  const saveUsersToStorage = async (users) => {
    try {
      await AsyncStorage.setItem("cached_users", JSON.stringify(users));
    } catch (e) {
      console.log("Error saving users to storage", e);
    }
  };

  const fetchData = async () => {
    try {
      const friendsRes = await fetch(`${API_URL}/users/friends/${userId}`, {
        headers: { Authorization: auth || "" }, // ایمن‌سازی header
      });

      if (!friendsRes.ok) throw new Error("Fetch error");

      const friends = await friendsRes.json();
      const allUsers = Array.isArray(friends) ? [me, ...friends] : [me];
      setUsers(allUsers);
      saveUsersToStorage(allUsers);
    } catch (error) {
      console.warn("fetchData failed", error);
      setNet(false);
      setUsers([me]); // fallback امن
    } finally {
      setLoading(false);
    }
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const unreadA = unreadMessages[a.id] || 0;
      const unreadB = unreadMessages[b.id] || 0;
      // کاربران با تعداد پیام خوانده نشده بالاتر در ابتدا قرار می‌گیرند
      return unreadB - unreadA;
    });
  }, [users, unreadMessages]);

  const handleDeletedMessage = (messageId) => {
    setMessages((prev) => {
      const updatedMessages = prev.filter((msg) => msg.id !== messageId);

      // ذخیره پیام‌های به‌روز شده در لوکال استوریج
      saveMessagesToStorage(
        selectedUser?.id || receiverId, // استفاده از receiverId فعلی یا selectedUser
        updatedMessages
      );

      return updatedMessages;
    });
  };

  const sendMessage = () => {
    try {
      setIsSending(1);

      if (!newMessage?.trim() || !selectedUser?.id || isSending) return;
      if (!userId) {
        console.warn("Cannot send message, user info missing");
        return;
      }

      const tempMessage = {
        sender_id: userId,
        receiver_id: selectedUser.id,
        message: newMessage,
        reply_to: replyingTo?.id || null,
        reply_to_text: replyingTo?.message || null,
      };

      // پاک کردن ورودی بلافاصله
      setNewMessage("");
      setReplyingTo(null);

      // 2) همه‌ی کارهای native یا سنگین رو پس از interactions اجرا کن
      InteractionManager.runAfterInteractions(() => {
        try {
          socketRef.current.emit("send_message", tempMessage, () => {
            setIsSending(false);
          });
        } catch (err) {
          console.error("Socket emit failed:", err);
        }
      });
    } catch (err) {
      console.error("sendMessage top-level error:", err);
    }
    setIsSending(0);
  };

  const handleSearch = debounce(async (query) => {
    if (query.length < 3) return setSearchResults([]);

    try {
      const res = await fetch(`${API_URL}/users/search?name=${query}`, {
        headers: { Authorization: auth },
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      return;
    }
  }, 500);

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return "";

    const now = new Date();
    const msgDate = new Date(timestamp);

    if (isNaN(msgDate.getTime())) return "";

    const isToday = now.toDateString() === msgDate.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === msgDate.toDateString();

    if (isToday) return "امروز";
    if (isYesterday) return "دیروز";
    return msgDate.toLocaleDateString("fa-IR", {
      month: "long",
      day: "numeric",
    });
  };

  const urlRegex = /https?:\/\/[^\s]+/g;
  const extractLinks = (text) => {
    return text.match(urlRegex) || [];
  };

  const renderMessageWithLinks = (text) => {
    const parts = text.split(urlRegex);
    const links = text.match(urlRegex) || [];

    const result = [];

    for (let i = 0; i < parts.length; i++) {
      result.push(
        <Text key={`text-${i}`} style={styles.normalText}>
          {parts[i]}
        </Text>
      );

      if (links[i]) {
        result.push(
          <Text
            key={`link-${i}`}
            style={styles.linkText}
            onPress={() => Linking.openURL(links[i])}
          >
            {links[i]}
          </Text>
        );
      }
    }

    return result;
  };

  const containsRoomsaraLink = (message) => {
    const links = extractLinks(message);
    return links.some((link) => link.startsWith("https://roomsara.liara.run"));
  };

  const MessageItem = React.memo(({ item, showDate }) => {
    return (
      <Animated.View style={styles.messageWrapper}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {formatMessageDate(item.timestamp)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.messageBubble,
            item.sender_id === userId
              ? styles.sentMessage
              : styles.receivedMessage,
            item.status === "sending" && styles.sendingMessage, // استایل مخصوص پیام در حال ارسال
          ]}
          activeOpacity={0.9}
          onLongPress={() => {
            if (item.status !== "sending") {
              // فقط برای پیام‌های ارسال شده
              setSelectedMessage(item);
              setShowContextMenu(true);
            }
          }}
        >
          {/* Reply Preview */}
          {item.reply_to && (
            <View
              style={[
                styles.replyContainer,
                item.sender_id === userId
                  ? styles.sentReply
                  : styles.receivedReply,
              ]}
            >
              <Text style={styles.replyText}>
                {item.reply_to_text || "این پیام حذف شده"}
              </Text>
            </View>
          )}

          {/* Roomsara Link Preview */}
          {containsRoomsaraLink(item.message) && (
            <View style={styles.linkPreview}>
              <Image
                source={require("../../assets/logoblue.png")}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 10,
                  marginVertical: 1,
                }}
              />
            </View>
          )}

          {/* Message Text or Link */}
          <Text
            style={[
              styles.messageText,
              item.sender_id === userId ? styles.sentText : styles.receivedText,
              item.status === "sending" && styles.sendingText,
            ]}
          >
            {renderMessageWithLinks(item?.message ?? "")}
          </Text>

          {/* Message Footer */}
          <View
            style={[
              styles.messageFooter,
              item.sender_id === userId && {
                flexDirection: "row-reverse",
                justifyContent: "flex-start",
              },
            ]}
          >
            {item.sender_id === userId && (
              <Ionicons
                name={"checkmark"}
                size={14}
                style={styles.statusIcon}
                color={
                  item.status === "read"
                    ? "#4CAF50"
                    : item.status === "sent"
                    ? "#FFFFFF99"
                    : "#FFFFFF99"
                }
              />
            )}
            <Text
              style={[
                styles.timeText,
                item.sender_id === userId
                  ? styles.sentTime
                  : styles.receivedTime,
                item.status === "sending" && styles.sendingTime, // زمان محو برای پیام در حال ارسال
              ]}
            >
              {item?.timestamp ? moment(item.timestamp).format("HH:mm") : ""}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const SearchModal = () => {
    const [isSearching, setIsSearching] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: showSearchModal ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [showSearchModal]);

    useEffect(() => {
      if (isFocused) {
        Animated.spring(scaleAnim, {
          toValue: 1.03,
          friction: 3,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }).start();
      }
    }, [isFocused]);

    const handleSearchPress = useCallback(async () => {
      if (localSearchQuery.length < 3) {
        return;
      }
      setIsSearching(true);
      try {
        await handleSearch(localSearchQuery);
      } finally {
        setIsSearching(false);
      }
    }, [localSearchQuery]);

    useEffect(() => {
      const searchDelay = setTimeout(() => {
        if (localSearchQuery.length >= 3) {
          handleSearchPress();
        }
      }, 500);

      return () => clearTimeout(searchDelay);
    }, [localSearchQuery, handleSearchPress]);

    const SearchItem = React.memo(({ item }) => (
      <TouchableOpacity
        style={styles.searchItem}
        onPress={() => {
          handleSelectUser(item);
          setShowSearchModal(false);
        }}
      >
        <View style={styles.profileContainer}>
          <Image
            source={
              item.profile_image
                ? { uri: `${API_URL}/${item.profile_image}` }
                : require("../../assets/noneprofile.jpg")
            }
            style={styles.searchProfileImage}
          />
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.searchName}>{item.name}</Text>
          <Text style={styles.searchEmail}>{item.email}</Text>
        </View>

        <View style={styles.actionButton}>
          <LinearGradient
            colors={["#ee9b00", "#ff6b35"]}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="chatbubble" size={20} color="#fff" />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    ));

    return (
      <Modal
        visible={showSearchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View
            style={[styles.searchModal, { transform: [{ scale: scaleAnim }] }]}
          >
            <View style={styles.searchInputContainer}>
              <Animated.View
                style={[
                  {
                    borderColor: isFocused ? "#ee9b00" : "#2d3a4d",
                    borderWidth: isFocused ? 2 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 30,
                    paddingHorizontal: 15,
                    marginBottom: 15,
                  },
                ]}
              >
                <Ionicons
                  name="search"
                  size={24}
                  color={isFocused ? "#ee9b00" : "#8a8f98"}
                  style={styles.searchIcon}
                />

                <TextInput
                  clearButtonMode="never" // برای iOS
                  underlineColorAndroid="transparent" // برای اندروید
                  style={styles.searchInput}
                  placeholder="جستجوی کاربر..."
                  placeholderTextColor="#8a8f98"
                  value={localSearchQuery}
                  onChangeText={setLocalSearchQuery}
                  autoFocus
                  autoCorrect={false}
                  autoCapitalize="none"
                  onSubmitEditing={handleSearchPress}
                  returnKeyType="search"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />

                {localSearchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setLocalSearchQuery("")}
                  >
                    <Ionicons name="close-circle" size={22} color="#8a8f98" />
                  </TouchableOpacity>
                )}
              </Animated.View>

              {localSearchQuery.length >= 3 && (
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleSearchPress}
                  disabled={isSearching}
                >
                  <LinearGradient
                    colors={["#ee9b00", "#ff6b35"]}
                    style={styles.gradientSearchButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isSearching ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.searchButtonText}>. . .</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ee9b00" />
                <Text style={styles.loadingText}>در حال جستجو...</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <SearchItem item={item} />}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <Text style={styles.resultsTitle}>
                    {searchResults.length > 0
                      ? `نتایج جستجو (${searchResults.length})`
                      : "کـاربـری وجـود نـدارد"}
                  </Text>
                }
                ListEmptyComponent={
                  localSearchQuery.length >= 3 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="search" size={60} color="#2d3a4d" />
                      <Text style={styles.emptySearchText}>
                        کاربری با مشخصات وارد شده یافت نشد
                      </Text>
                      <Text style={styles.emptyHintText}>
                        از صحت اطلاعات وارد شده اطمینان حاصل کنید
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="people" size={60} color="#2d3a4d" />
                      <Text style={styles.emptySearchText}>
                        برای جستجو، حداقل ۳ کاراکتر وارد کنید
                      </Text>
                      <Text style={styles.emptyHintText}>
                        نام کاربری یا ایمیل را وارد نمایید
                      </Text>
                    </View>
                  )
                }
              />
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  // Utility functions

  const loadMessagesFromStorage = async (receiverId) => {
    if (!receiverId) return [];
    try {
      const json = await AsyncStorage.getItem(`messages_${receiverId}`);
      const data = json ? JSON.parse(json) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("Error loading messages from storage", e);
      return [];
    }
  };

  const handleSelectUser = async (user) => {
    setMessages([]);
    setShowSearchModal(false);
    setSelectedUser(user);
    setShowNavbar(false);
    offsetRef.current = 0;
    setHasMoreMessages(true);

    const cachedMessages = await loadMessagesFromStorage(user.id);
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
      setShowNoMessages(false);
    }

    // 2. بعد به‌صورت async از سرور پیام‌های جدیدتر رو بیار
    offsetRef.current = 0;
    setHasMoreMessages(true);
    loadMessages(user.id, true);

    // اگر برای این کاربر پیام خوانده نشده داریم، به سرور اطلاع بدهیم که آن‌ها خوانده شده‌اند
    if (unreadMessages[user.id]) {
      socketRef.current.emit("mark_all_messages_as_read", {
        sender_id: user.id, // پیام‌ها از این کاربر به شما
        receiver_id: userId, // شما دریافت‌کننده هستید
      });
      // شمارش پیام‌های خوانده نشده برای این کاربر رو پاک می‌کنیم
      setUnreadMessages((prev) => {
        const updated = { ...prev };
        delete updated[user.id];
        return updated;
      });
      const hasUnreadMessages = Object.values(unreadMessages).some(
        (count) => count > 0
      );
      setUnread(hasUnreadMessages);
    }
  };

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showNoMessages, setShowNoMessages] = useState(false);
  const isLoadingRef = useRef(false);
  const limit = 20;
  const flatListRef = useRef(null);
  useEffect(() => {
    if (!isLoadingMessages && messages.length === 0) {
      setShowNoMessages(true);
    } else {
      setShowNoMessages(false);
    }
  }, [isLoadingMessages, messages]);

  const saveMessagesToStorage = async (receiverId, messages) => {
    try {
      await AsyncStorage.setItem(
        `messages_${receiverId}`,
        JSON.stringify(messages)
      );
    } catch (e) {
      console.error("Error saving messages to storage", e);
    }
  };
  const loadMessages = async (receiverId, isInitial = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoadingMessages(true);

    try {
      const res = await fetch(
        `${API_URL}/messages/get/${userId}/${receiverId}?offset=${offsetRef.current}&limit=${limit}`,
        {
          headers: { Authorization: auth },
        }
      );

      const text = await res.text(); // دریافت متن خام

      let data;
      try {
        data = JSON.parse(text); // تلاش برای تبدیل به JSON
      } catch (err) {}

      if (!Array.isArray(data) || data.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      offsetRef.current += data.length;
      setHasMoreMessages(data.length === limit);

      const enhancedMessages = data.map((msg) => ({
        ...msg,
        replyToMessage: msg.reply_to
          ? data.find((m) => m.id === msg.reply_to)?.message ||
            "Message not found"
          : null,
        status: msg.status || "sent",
      }));

      if (isInitial) {
        setMessages(enhancedMessages);
        await saveMessagesToStorage(receiverId, enhancedMessages);
      } else {
        setMessages((prev) => {
          const updated = [...prev, ...enhancedMessages];
          saveMessagesToStorage(receiverId, updated);
          return updated;
        });
      }
    } catch (error) {
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      offsetRef.current = 0;
      setHasMoreMessages(true);
      loadMessages(selectedUser.id, true);
    }
  }, [selectedUser]);
  const handleLoadMore = () => {
    if (hasMoreMessages && !isLoadingRef.current) {
      loadMessages(selectedUser.id);
    }
  };
  const renderItem = ({ item, index }) => {
    if (!item || !item.timestamp) return null; // ایمن‌سازی برای داده خراب

    const nextMessage = messages[index + 1]; // ok
    const currentDay = new Date(item.timestamp).toDateString();
    const nextDay =
      nextMessage && nextMessage.timestamp
        ? new Date(nextMessage.timestamp).toDateString()
        : null;

    // Show date if last message or day changed compared to next
    const showDate = index === messages.length - 1 || currentDay !== nextDay;

    return <MessageItem item={item} showDate={showDate} />;
  };

  const handleCopyMessage = () => {
    Clipboard.setString(selectedMessage.message);
    setShowContextMenu(false);
  };

  const animatedHeight = useRef(new Animated.Value(70)).current;
  const animatedTop = useRef(new Animated.Value(20)).current;
  const animatedBorderRadius = useRef(new Animated.Value(50)).current;
  const lastScrollY = useRef(0);
  const panResponder2 = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        const isScrollingDown = gestureState.dy < 0;

        if (isScrollingDown) {
          // حرکت به بالا - گسترش تا تمام صفحه
          Animated.parallel([
            Animated.spring(animatedHeight, {
              toValue: 100, // تمام صفحه
              useNativeDriver: false,
            }),
            Animated.spring(animatedTop, {
              toValue: 0,
              useNativeDriver: false,
            }),
            Animated.spring(animatedBorderRadius, {
              toValue: 0,
              useNativeDriver: false,
            }),
          ]).start();
        } else {
          // حرکت به پایین - بازگشت به سایز اولیه
          Animated.parallel([
            Animated.spring(animatedHeight, {
              toValue: 70, // سایز اولیه
              useNativeDriver: false,
            }),
            Animated.spring(animatedTop, {
              toValue: 20,
              useNativeDriver: false,
            }),
            Animated.spring(animatedBorderRadius, {
              toValue: 50,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // در داخل کامپوننت، قبل از return:
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        // تشخیص جهت کشیدن
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          // حرکت افقی
          return true;
        }
        return false;
      },
      onPanResponderRelease: (evt, gestureState) => {
        // اگر کشیدن از چپ به راست یا راست به چپ با حداقل فاصله بود
        if (Math.abs(gestureState.dx) > 100) {
          setSelectedUser(null);
          setShowNavbar(true);
        }
      },
    })
  ).current;

  let lastDate = null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : null}
      keyboardVerticalOffset={Platform.select({
        ios: 90,
        android: 0,
      })}
    >
      {/* Chat List */}
      {!selectedUser ? (
        <LinearGradient colors={["#273144", "#273144"]} style={styles.chatList}>
          <View style={styles.listHeader}>
            <View
              style={{
                width: "90%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                flexDirection: "row",
                marginBottom: 0,
              }}
            >
              <Image
                source={require("../../assets/banner.png")}
                style={{
                  width: 270,
                  height: 70,
                  position: "relative",
                  left: 27,
                }}
              />
              <Image
                source={require("../../assets/message.png")}
                style={{
                  width: 37,
                  height: 37,
                  tintColor: "white",
                  position: "absolute",
                  left: 8,
                  marginTop: 20,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={() => setShowSearchModal(true)}
              style={[
                styles.searchButton,
                {
                  width: "90%",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  direction: "rtl",
                  gap: 12,
                },
              ]}
            >
              <Ionicons name="search" size={24} color="#CCCCCC" />
              <Text
                style={{
                  color: "#CCCCCC",
                  marginTop: 1,
                  fontSize: 15,
                  fontFamily: "Vazir",
                }}
              >
                جسـت و جــو
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#ee9b00"
              style={styles.loader}
            />
          ) : (
            <View
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                height: "100%",
              }}
            >
              {/*note component should be here*/}
              <Notes
                me={me}
                userId={userId}
                setFriendNotes={setFriendNotes}
                API_URL={API_URL}
                friendNotes={friendNotes}
                auth={auth}
              />

              <Animated.View
                style={{
                  position: "absolute",
                  overflow: "scroll",
                  bottom: animatedTop,
                  paddingTop: 15,
                  backgroundColor: "#1a2332",
                  borderTopEndRadius: animatedBorderRadius,
                  borderTopLeftRadius: animatedBorderRadius,
                  paddingBottom: 190,
                  height: animatedHeight.interpolate({
                    inputRange: [0, 102],
                    outputRange: [0, screenHeight + 112],
                  }),
                  width: "100%",
                  zIndex: 10,
                }}
                {...panResponder2.panHandlers}
              >
                <View
                  style={{
                    marginLeft: "auto",
                    marginRight: "auto",
                    marginBottom: 4,
                    width: 30,
                    height: 3,
                    borderRadius: 10,
                    backgroundColor: "#CCCCCC",
                    position: "relative",
                    bottom: 7,
                  }}
                ></View>
                <FlatList
                  data={sortedUsers?.filter(Boolean) || []}
                  keyExtractor={(item, index) =>
                    `${item?.id || "no-id"}-${index}`
                  }
                  renderItem={({ item }) =>
                    item ? (
                      <TouchableOpacity
                        style={styles.chatItem}
                        onPress={() => handleSelectUser(item)}
                      >
                        <View style={styles.profileContainer}>
                          <Image
                            source={
                              item.id === userId
                                ? require("../../assets/savedmessage.jpg")
                                : item.profile_image
                                ? { uri: `${API_URL}/${item.profile_image}` }
                                : require("../../assets/noneprofile.jpg")
                            }
                            style={styles.profileImage}
                          />
                          {unreadMessages[item.id] > 0 && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadText}>
                                {unreadMessages[item.id]}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.chatInfo}>
                          <Text style={styles.userName}>
                            {item.id === userId
                              ? "پیام‌های ذخیره شده"
                              : item.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null
                  }
                />
              </Animated.View>
            </View>
          )}
        </LinearGradient>
      ) : (
        // Chat Window
        <View style={[styles.chatWindow]} {...panResponder.panHandlers}>
          {/* Chat Header */}
          <LinearGradient
            colors={["#222D3F", "#222D3F"]}
            style={styles.chatHeader}
          >
            <Image
              source={
                selectedUser.id === userId
                  ? require("../../assets/savedmessage.jpg")
                  : selectedUser.profile_image
                  ? { uri: `${API_URL}/${selectedUser.profile_image}` }
                  : require("../../assets/noneprofile.jpg")
              }
              style={styles.headerProfileImage}
            />

            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>
                {selectedUser.id === userId
                  ? "پیام‌های ذخیره شده"
                  : selectedUser.name}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedUser(null);
                setShowNavbar(true);
                setNewMessage("");
                setReplyingTo("");
              }}
            >
              <Ionicons name="arrow-back" size={28} color="#ee9b00" />
            </TouchableOpacity>
          </LinearGradient>
          {/* Messages List */}
          <VirtualizedList
            ref={flatListRef}
            data={Array.isArray(messages) ? messages : []} // ایمن‌سازی
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item && item.id ? `${item.id}-${index}` : `key-${index}`
            }
            inverted={true} // برای نمایش برعکس مثل چت
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            getItem={(data, index) => data[index]} // الزامی برای VirtualizedList
            getItemCount={(data) => data.length} // الزامی برای VirtualizedList
            ListFooterComponent={() => {
              if (isLoadingMessages) {
                return (
                  <ActivityIndicator
                    size="small"
                    color="#999"
                    style={{ marginVertical: 8 }}
                  />
                );
              }

              if (showNoMessages) {
                return (
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      marginVertical: "70%",
                      padding: 10,
                      borderRadius: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: "#666",
                        textAlign: "center",
                        fontFamily: "Vazir",
                      }}
                    >
                      پیامی وجود ندارد
                    </Text>
                  </View>
                );
              }

              return null;
            }}
            contentContainerStyle={styles.messagesContainer || {}}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20} // مثل FlatList
          />
          {/* Reply Preview */}
          {replyingTo && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                پاسخ به: {replyingTo.message}
              </Text>
              <TouchableOpacity
                style={styles.cancelReply}
                onPress={() => setReplyingTo(null)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          {/* Input Area */}
          <View style={styles.inputContainer}>
            <Animated.View
              style={[
                styles.inputWrapper2,
                {
                  flex: inputFlex,
                  marginRight: newMessage.trim() ? 8 : 0, // فقط وقتی دکمه وجود دارد margin اعمال شود
                },
              ]} //inputwidth
            >
              <TextInput
                style={[
                  styles.messageInput,
                  isFocused && styles.messageInputFocused,
                ]}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="پیام خود را بنویسید..."
                placeholderTextColor="#8c8c8c9b"
                multiline
                textAlign="right"
                onFocus={() => {
                  setIsFocused(true);
                  socketRef.current.emit("typing", {
                    receiverId: selectedUser.id,
                    isTyping: true,
                  });
                }}
                onBlur={() => {
                  setIsFocused(false);
                  socketRef.current.emit("typing", {
                    receiverId: selectedUser.id,
                    isTyping: false,
                  });
                }}
              />
            </Animated.View>
          </View>
          {/* دکمه ارسال با انیمیشن‌های حرفه‌ای */}
          <Animated.View
            style={[
              styles.sendButtonContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!newMessage.trim()}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#FF6B00", "#EE9B00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientButton, { width: 60, height: 60 }]}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={30} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Context Menu */}
      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <TouchableOpacity
          style={styles.contextMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowContextMenu(false)}
        >
          <Animated.View
            style={[
              styles.contextMenuContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={["#1a1a2e", "#16213e"]}
              style={styles.contextMenu}
            >
              {selectedMessage?.sender_id === userId && (
                <TouchableOpacity
                  style={styles.contextMenuItem}
                  onPress={() => {
                    const messageId = selectedMessage.id;
                    const sender_id = userId;
                    const receiver_id = selectedUser.id;
                    socketRef.current.emit("delete_message", {
                      messageId,
                      sender_id,
                      receiver_id,
                    });
                    setShowContextMenu(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemContent}>
                    <Ionicons name="trash-bin" size={24} color="#ff4444" />
                    <Text
                      style={[styles.contextMenuText, { color: "#ff4444" }]}
                    >
                      حذف پیام
                    </Text>
                  </View>
                  <View style={styles.rippleEffect} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={handleCopyMessage}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="copy" size={24} color="#ee9b00" />
                  <Text style={styles.contextMenuText}>کپی پیام</Text>
                </View>
                <View style={styles.rippleEffect} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  setReplyingTo(selectedMessage);
                  setShowContextMenu(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="arrow-undo" size={24} color="#ee9b00" />
                  <Text style={styles.contextMenuText}>پاسخ دادن</Text>
                </View>
                <View style={styles.rippleEffect} />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <SearchModal />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    direction: "rtl",
    writingDirection: "rtl",
  },
  chatList: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 70,
    direction: "rtl",
    writingDirection: "rtl",
  },
  listHeader: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#ee9b00",
    paddingVertical: 20,
    zIndex: 10,
    borderRadius: 40,
    marginTop: 30,
    marginHorizontal: 10,
  },
  headerTitle: {
    color: "#ee9b00",
    fontSize: 24,
    fontFamily: "Vazir",
  },
  searchButton: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: "#2d3a4d",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2332",
    borderRadius: 16,
    padding: 10,
    marginVertical: 6,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: "#ee9b00",
  },
  profileContainer: {
    position: "relative",
    marginLeft: 12,
  },
  profileImage: {
    width: 55,
    height: 55,
    borderRadius: 28,
  },
  chatInfo: {
    flex: 1,
    paddingRight: 10,
    justifyContent: "center",
  },
  userName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "left",
    fontFamily: "Vazir",
  },
  lastSeenText: {
    color: "#8a8f98",
    fontSize: 14,
    marginTop: 4,
    fontFamily: "Vazir",
  },
  emptyText: {
    color: "#8a8f98",
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    fontFamily: "Vazir",
  },
  chatWindow: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "#1a2332",
    overflow: "hidden",
    direction: "rtl",
    writingDirection: "rtl",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 35,
    borderRadius: 20,
  },
  backButton: {
    marginHorizontal: 10,
  },
  headerInfo: {
    flex: 1,
    marginRight: "auto",
  },
  headerName: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Vazir",
  },
  headerStatus: {
    color: "#8a8f98",
    fontSize: 14,
    marginTop: 4,
    fontFamily: "Vazir",
  },
  headerProfileImage: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 8,
    marginLeft: 10,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 10,
  },
  inputContainer: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 6,
    backgroundColor: "transparent",
    direction: "rtl",
    writingDirection: "rtl",
  },
  inputWrapper2: {
    backgroundColor: "#222D3F",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
    direction: "rtl",
    writingDirection: "rtl",
  },
  messageInput: {
    color: "#ffffff",
    fontSize: 16,
    minHeight: 40,
    maxHeight: 120,
    includeFontPadding: true,
    fontFamily: "Vazir",
    textAlignVertical: "center",
    paddingTop: 10,
    direction: "rtl",
    writingDirection: "rtl",
  },
  messageInputFocused: {},
  sendButtonContainer: {
    marginLeft: 8,
    marginBottom: 10,
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    position: "absolute",
    right: 12,
    bottom: 5,
    direction: "rtl",
    writingDirection: "rtl",
  },
  gradientButton: {
    width: 40,
    height: 40,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    marginHorizontal: 0,
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 14,
  },
  attachButton: {
    marginRight: 10,
    padding: 10,
  },
  replyPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2d3a4d",
    padding: 10,
    marginHorizontal: 15,
    borderRadius: 40,
    marginBottom: 0,
    overflow: "hidden", // جلوگیری از خروج محتوا از باکس
  },
  replyPreviewText: {
    color: "#ee9b00",
    fontSize: 14,
    flex: 1,
    marginLeft: 10,
    position: "absolute",
    left: 19,
    flexShrink: 1,
    overflow: "hidden",
    width: "80%",
    fontFamily: "Vazir",
  },
  cancelReply: {
    padding: 5,
  },
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  contextMenuContainer: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  contextMenu: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    minWidth: 240,
  },
  contextMenuItem: {
    paddingVertical: 10,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 4,
  },
  menuItemContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  contextMenuText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  rippleEffect: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.1)",
    opacity: 0,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(108,117,125,0.3)",
    marginVertical: 8,
    marginHorizontal: -15,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    left: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchModal: {
    width: "100%",
    maxHeight: height * 0.8,
    backgroundColor: "#1a2332",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2d3a4d",
  },
  searchHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a4d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: "#ee9b00",
    fontSize: 22,
    fontFamily: "Vazir",

    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: 5,
    zIndex: 10,
  },
  searchInputContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a4d",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 16,
    textAlign: "right",
    fontFamily: "Vazir",
  },
  clearButton: {
    padding: 5,
  },
  searchButton: {
    marginTop: 5,
  },
  gradientSearchButton: {
    borderRadius: 30,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Vazir",
    paddingHorizontal: 80,
    paddingVertical: 2,
  },
  resultsTitle: {
    color: "#8a8f98",
    textAlign: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a4d",
    backgroundColor: "#1a2332",
    fontFamily: "Vazir",
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a4d",
  },
  profileContainer: {
    position: "relative",
  },
  searchProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  statusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 10,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#1a2332",
  },
  userInfo: {
    flex: 1,
    flexDirection: "column",
  },
  searchName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
    fontFamily: "Vazir",
  },
  searchEmail: {
    color: "#8a8f98",
    fontSize: 14,
    fontFamily: "Vazir",
  },
  actionButton: {
    marginLeft: 10,
  },

  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySearchText: {
    color: "#8a8f98",
    textAlign: "center",
    marginTop: 20,
    fontSize: 18,
    marginHorizontal: 20,
    fontFamily: "Vazir",
  },
  emptyHintText: {
    color: "#5a6475",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    marginHorizontal: 30,
    fontFamily: "Vazir",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#8a8f98",
    textAlign: "center",
    marginTop: 15,
    fontSize: 16,
    fontFamily: "Vazir",
  },
  messageWrapper: {
    marginVertical: 3,
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#181d25",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: "auto",
  },
  dateText: {
    color: "#CCCCCC",
    fontSize: 12,
    fontFamily: "Vazir",
    marginHorizontal: 0,
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 2,
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: "auto",
  },
  messageBubble: {
    maxWidth: "80%",
    minWidth: "26%",
    borderRadius: 20,
    padding: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sentMessage: {
    backgroundColor: "#36475B",
    alignSelf: "flex-start",
    marginRight: 1,
    marginLeft: 1,
    direction: "ltr",
  },
  receivedMessage: {
    backgroundColor: "#2A3344",
    alignSelf: "flex-end",
    marginLeft: 1,
    marginLeft: 1,
    direction: "ltr",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 23,
    fontFamily: "Vazir",
  },
  sentText: {
    color: "#FFFFFF",
    textAlign: "right",
  },
  receivedText: {
    color: "#E0E0E0",
    textAlign: "right",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Vazir",
  },
  sentTime: {
    color: "#BBDEFB90",
  },
  receivedTime: {
    color: "#9E9E9E",
  },
  statusIcon: {
    marginHorizontal: 2,
  },
  replyContainer: {
    borderLeftWidth: 3,
    borderRadius: 6,
    marginBottom: 8,
    paddingLeft: 8,
    paddingVertical: 6,
  },
  sentReply: {
    borderLeftColor: "#262626",
    backgroundColor: "#2D426350",
  },
  receivedReply: {
    borderLeftColor: "#2D4263",
    backgroundColor: "#26262650",
  },
  replyText: {
    color: "#BDBDBD",
    fontSize: 14,
    fontFamily: "Vazir",
    lineHeight: 20,
  },
  loader: {
    marginTop: 50,
  },
  searchModal: {
    flex: 1,
    backgroundColor: "#1a2332",
    paddingTop: 50,
    width: "100%",
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a4d",
  },
  searchButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#2d3a4d",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    padding: 8,
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2d3a4d",
  },
  searchProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 15,
  },
  searchName: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
    fontFamily: "Vazir",
  },
  emptySearchText: {
    color: "#8a8f98",
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
    fontFamily: "Vazir",
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginLeft: 10,
  },
  unreadBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    backgroundColor: "#ff4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Vazir",
  },
  linkText: {
    color: "#1e90ff", // رنگ لینک
    textDecorationLine: "underline", // زیرخط برای لینک
  },
  linkPreview: {
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#0f1728",
    padding: 0,
    borderRadius: 12,
    marginBottom: 5,
    gap: 2,
  },
  linkPreviewText: {
    color: "#CCCCCC",
    fontSize: 14,
    marginLeft: 5,
    fontFamily: "Vazir",
  },
  sendingMessage: {
    opacity: 0.8,
  },
  sendingText: {
    opacity: 0.7,
  },
  sendingTime: {
    opacity: 0.6,
  },
});

export default Chat;
