import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Alert,
  BackHandler,
  Image,
  Text,
  Modal,
  Animated,
  Easing,
  Linking,
  StatusBar,
  I18nManager,
} from "react-native";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Login from "./components/Login";
import Setting from "./components/pages/Setting";
import SignUp from "./components/SingIn";
import Chat from "./components/pages/Chat";
import HomePage from "./components/pages/Home";
import { Ionicons } from "@expo/vector-icons";

//const API_URL = "http://10.0.2.2:3000";
//const API_URL = "https://roomsaraservernet.liara.run";

const API_URL = "https://roomsaraservernet.liara.run";
const App = () => {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
  const [authorization, setAuthorazation] = useState(false);
  const [signin, setSignIn] = useState(false);
  const [userId, setUserId] = useState();
  const [activeTab, setActiveTab] = useState("Home");
  const [showNavbar, setShowNavbar] = useState(true);
  const [me, setMe] = useState();
  const [unread, setUnread] = useState(false);
  const [auth, setAuth] = useState();
  const [net, setNet] = useState(true);
  const [update, setUpdate] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [friendNotes, setFriendNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Vazir: require("./assets/fonts/Vazir.ttf"),
  });
  //لیست اتاق ها
  const [activeRooms, setActiveRooms] = useState([]);
  const fetchRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/rooms/enablerooms/${userId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
      });
      const data = await response.json();
      setActiveRooms(data); // ذخیره اطلاعات توی state
    } catch (error) {
      console.error("خطا در دریافت اتاق‌ها:", error);
    }
  };
  useEffect(() => {
    if (userId && auth) fetchRooms();
  }, [userId, auth]);

  //init the notes and users ---------------------------------
  useEffect(() => {
    if (!userId || users.length === 0 || !auth) return;

    const fetchFriendNotes = async () => {
      try {
        const friendIds = [
          ...users.filter((u) => u && u.id && u.id !== userId).map((u) => u.id),
          userId,
        ];

        const res = await fetch(`${API_URL}/messages/friends-notes/${userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: auth,
          },
          body: JSON.stringify({ friendIds }),
        });

        if (!res.ok) throw new Error("Failed to fetch notes");

        const notes = await res.json();
        setFriendNotes(notes);
      } catch (err) {
        console.log("Error fetching notes", err);
      }
    };

    fetchFriendNotes();
  }, [userId, users]);

  useEffect(() => {
    const init = async () => {
      const cached = await loadUsersFromStorage();
      if (!cached?.length) {
        await fetchData();
      } else {
        setLoading(false); // ← اضافه کن برای زمانی که فقط از کش می‌خونه
      }
    };

    if (auth && userId) init();
  }, [auth, userId]);

  const loadUsersFromStorage = async () => {
    try {
      const json = await AsyncStorage.getItem("cached_users");
      if (json) {
        const cached = JSON.parse(json);

        // فیلتر کردن کاربران بدون پیام
        const filteredUsers = await Promise.all(
          cached.map(async (user) => {
            const lastMessage = await getLastMessage(user.id);
            return lastMessage ? user : null; // فقط کاربرانی که پیام دارن نگه دار
          })
        ).then((results) => results.filter((user) => user !== null));

        // ذخیره کاربران فیلتر شده توی لوکال استوریج
        await AsyncStorage.setItem(
          "cached_users",
          JSON.stringify(filteredUsers)
        );

        // مرتب‌سازی و ست کردن state
        const sorted = await sortUsersByLastMessage(filteredUsers);
        setUsers(sorted);
        return sorted;
      }
      return [];
    } catch (e) {
      console.log("Error loading users from storage", e);
      return [];
    }
  };

  const fetchData = async () => {
    try {
      const [friendsRes] = await Promise.all([
        fetch(`${API_URL}/users/friends/${userId}`, {
          headers: { Authorization: auth },
        }),
      ]);

      if (!friendsRes.ok) throw new Error("Fetch error");

      const [friends] = await Promise.all([friendsRes.json()]);
      setUsers([me, ...friends]);
      const allUsers = [me, ...friends];
      setUsers(allUsers);
      console.log("hi");
      saveUsersToStorage(allUsers);
    } catch (error) {
      setNet(false);
    } finally {
      setLoading(false);
    }
  };

  const saveUsersToStorage = async (users) => {
    try {
      await AsyncStorage.setItem("cached_users", JSON.stringify(users));
    } catch (e) {
      console.log("Error saving users to storage", e);
    }
  };

  const sortUsersByLastMessage = async (users) => {
    const usersWithMessages = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await getLastMessage(user.id);
        return {
          ...user,
          lastMessageTime: lastMessage?.timestamp || 0,
          lastMessage: lastMessage?.message || "",
        };
      })
    );

    return usersWithMessages.sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );
  };

  const getLastMessage = async (userId) => {
    try {
      const json = await AsyncStorage.getItem(`messages_${userId}`);
      if (json) {
        const msgs = JSON.parse(json);
        return msgs[0]; // چون پیام‌ها معمولاً جدید به قدیم ذخیره می‌شن
      }
    } catch (e) {
      console.log("Error reading messages", e);
    }
    return null;
  };
  //---------------------------------------------------------------

  const spinValue = new Animated.Value(0);
  // انیمیشن چرخش آیکون
  Animated.loop(
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  ).start();

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  //Get Update status
  useEffect(() => {
    if (!userId || !auth) return; // اگر auth یا userId وجود نداشت، متوقف شود

    const fetchDataa = async () => {
      try {
        const res = await fetch(`${API_URL}/users/update-application3`, {
          headers: { Authorization: auth },
        });

        if (!res.ok) {
          Alert.alert("Error: Unable to Get info");
          return;
        }

        const data = await res.json(); // حتما () رو بذارید!
        setUpdate(data.status);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchDataa();
  }, [userId, auth]); // ✅ فقط این دو مقدار باعث اجرا شدن مجدد useEffect بشن

  //Back Button
  useEffect(() => {
    const handleBackPress = () => {
      if (activeTab !== "Home") {
        setActiveTab("Home");
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
  }, [activeTab]);

  useEffect(() => {
    if (!userId || !auth) return;
    setActiveTab("Home");
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/users/GetByUserId/${userId}`, {
          headers: { Authorization: auth },
        });
        if (!res.ok) {
          Alert.alert("Error: Unable to find user");
          return;
        }
        const data = await res.json(); // باید اینجا () اضافه شود
        setMe(data);
      } catch (error) {
        console.error("Error fetching user:", error);
        setNet(false);
      }
    };

    fetchData();
  }, [userId, auth, net]);

  useEffect(() => {
    if (!userId || !auth) return;

    const fetchUnreadMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/messages/unread/${userId}`, {
          headers: { Authorization: auth },
        });
        if (response.ok) {
          const data = await response.json();
          // فرض کنید data به شکل { senderId1: count, senderId2: count, ... } برگرده

          // بررسی اینکه آیا پیام خوانده نشده‌ای وجود دارد یا خیر
          const hasUnreadMessages = Object.values(data).some(
            (count) => count > 0
          );
          setUnread(hasUnreadMessages); // اگر پیام خوانده نشده باشد، setUnread به true تغییر می‌کند
        } else {
          console.error("خطا در دریافت پیام‌های خوانده نشده");
        }
      } catch (error) {
        console.error("❌ خطا:", error);
        setNet(false);
      }
    };
    fetchUnreadMessages();
  }, [userId, auth, unread, net]);

  useEffect(() => {
    if (activeTab === "Create") {
      setIsCreateModalOpen(true);
    }
  }, [activeTab]);

  if (authorization === false && signin === false) {
    return (
      <Login
        setSignIn={setSignIn}
        setUserId={setUserId}
        setAuthorazation={setAuthorazation}
        setAuth={setAuth}
        authorization={authorization}
        setShowOnboarding={setShowOnboarding}
        showOnboarding={showOnboarding}
        onboardingCompleted={onboardingCompleted}
        setOnboardingCompleted={setOnboardingCompleted}
        userId={userId}
      />
    );
  } else if (authorization === false && signin === true) {
    return (
      <SignUp
        setSignIn={setSignIn}
        setUserId={setUserId}
        setAuthorazation={setAuthorazation}
        setAuth={setAuth}
      />
    );
  } else if (net === false) {
    return (
      <Modal transparent={true} animationType="fade" onRequestClose={() => {}}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(7, 11, 42, 0.86)",
          }}
        >
          <View
            style={{
              backgroundColor: "#273244",
              borderRadius: 20,
              padding: 30,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 5,
              elevation: 5,
              width: "80%",
            }}
          >
            {/* آیکون چرخان */}
            <Animated.View
              style={{
                transform: [{ rotate: spin }],
                marginBottom: 20,
              }}
            >
              <Ionicons name="wifi" size={50} color="#FF4444" />
            </Animated.View>

            {/* متن خطا */}
            <Text
              style={{
                fontSize: 22,
                color: "#FF4444",
                marginBottom: 10,
                fontFamily: "Vazir",
              }}
            >
              خطا در اتصال
            </Text>

            {/* توضیحات بیشتر */}
            <Text
              style={{
                fontSize: 16,
                color: "#CCCCCC",
                textAlign: "center",
                lineHeight: 24,
                fontFamily: "Vazir",
              }}
            >
              اتصال اینترنت شما قطع شده است. لطفاً اتصال خود را بررسی کرده و
              دوباره امتحان کنید.
            </Text>

            {/* دکمه اقدام (اختیاری) */}
            <TouchableOpacity
              style={{
                marginTop: 20,
                backgroundColor: "#FF4444",
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 10,
              }}
              onPress={() => {
                setNet(true);
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: "#FFFFFF",
                  fontFamily: "Vazir",
                }}
              >
                تلاش مجدد
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  } else if (update === "true") {
    return (
      <Modal transparent={true} animationType="fade" onRequestClose={() => {}}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#2d3a4d",
          }}
        >
          <View
            style={{
              backgroundColor: "#273244",
              borderRadius: 20,
              padding: 30,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 5,
              elevation: 5,
              width: "80%",
            }}
          >
            {/* متن خطا */}
            <Text
              style={{
                fontSize: 22,
                color: "#ee9b00",
                marginBottom: 10,
                fontFamily: "Vazir",
              }}
            >
              نسخه جدید در دسترس است !
            </Text>

            {/* توضیحات بیشتر */}
            <Text
              style={{
                fontSize: 16,
                color: "#CCCCCC",
                textAlign: "center",
                lineHeight: 24,
                fontFamily: "Vazir",
              }}
            >
              لطفا برای استفاده از برنامه نسخه جدید آن را نصب کنید.
            </Text>

            {/* دکمه اقدام (اختیاری) */}
            <TouchableOpacity
              style={{
                marginTop: 20,
                backgroundColor: "#ee9b00",
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 10,
              }}
              onPress={() => Linking.openURL("https://roomsara.liara.run")}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: "#FFFFFF",
                  fontFamily: "Vazir",
                }}
              >
                دانلود برنامه از وبسایت
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.background}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent
      />

      <View style={styles.container}>
        {activeTab === "Home" && (
          <HomePage
            setShowNavbar={setShowNavbar}
            Me={me}
            Auth={auth}
            userId={userId}
            isCreateModalOpen={isCreateModalOpen}
            setIsCreateModalOpen={setIsCreateModalOpen}
            activeRooms={activeRooms}
            fetchRooms={fetchRooms}
          />
        )}

        {activeTab === "Create" && (
          <HomePage
            setShowNavbar={setShowNavbar}
            Me={me}
            Auth={auth}
            userId={userId}
            isCreateModalOpen={isCreateModalOpen}
            setIsCreateModalOpen={setIsCreateModalOpen}
            activeRooms={activeRooms}
            fetchRooms={fetchRooms}
          />
        )}

        {activeTab === "Chat" && (
          <Chat
            setShowNavbar={setShowNavbar}
            auth={auth}
            userId={userId}
            setUnread={setUnread}
            setNet={setNet}
            me={me}
            setUsers={setUsers}
            users={users}
            setFriendNotes={setFriendNotes}
            friendNotes={friendNotes}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        {activeTab === "Setting" && (
          <Setting
            me={me}
            userId={userId}
            setAuthorazation={setAuthorazation}
            setMe={setMe}
            Auth={auth}
            setNet={setNet}
            setActiveTab={setActiveTab}
            setFriendNotes={setFriendNotes}
            setUnread={setUnread}
            setUsers={setUsers}
          />
        )}

        {showNavbar && (
          <View style={styles.navbar}>
            {[
              { name: "Home", icon: require("./assets/home.png") },
              {
                name: "Chat",
                icon: require("./assets/message.png"),
                hasUnread: unread,
              },
              { name: "Create", icon: require("./assets/add.png") },

              { name: "Setting", icon: require("./assets/setting.png") },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.name}
                onPress={() => setActiveTab(tab.name)}
                style={[
                  styles.navButton,
                  activeTab === tab.name && styles.activeNavButton,
                ]}
              >
                <Image
                  source={tab.icon}
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: activeTab === tab.name ? "#fff" : "#aaa", // تغییر رنگ بر اساس فعال بودن تب
                  }}
                />
                {tab.hasUnread && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1, // کل صفحه را پوشش دهد
    width: "100%",
    height: "100%",
    direction: "rtl",
    backgroundColor: "#0d1522",
  },
  itemM: { paddingTop: 25, paddingBottom: 55, paddingLeft: 7, paddingRight: 7 },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navbar: {
    flexDirection: "row",
    backgroundColor: "#273244",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 30,
    paddingRight: 30,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    position: "absolute",
    bottom: 0,
    width: "100%",
    gap: 50,
    zIndex: 12,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(53, 56, 94, 0.26)",
    borderRadius: 50,
    padding: 12, // به جای width/height ثابت
  },

  navText: {
    color: "#fff",
    fontFamily: "Vazir",
    fontSize: 14,
    textShadowColor: "#000000BF",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  activeNavButton: {
    backgroundColor: "#ee9b00",
    shadowColor: "#4A90E2",
    shadowOpacity: 0.6,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 3 },
  },
  activeNavText: {
    color: "gray",
    fontFamily: "Vazir",
    fontSize: 16,
  },
  tasksContainer: { padding: 20 },
  taskContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#444",
    padding: 10,
    borderRadius: 10,
  },
  taskItem: {
    padding: 10,
    color: "#fff",
    fontSize: 16,
    flex: 1,
    fontFamily: "Vazir",
  },
  taskCompleted: { textDecorationLine: "line-through", color: "#888" },
  switch: { marginLeft: 10 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  welcomeText: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 20,
    fontFamily: "Vazir",
  },
  sectionText: {
    color: "#fff",
    fontSize: 16,
    marginVertical: 10,
    fontFamily: "Vazir",
  },
  calendarContainer: {
    backgroundColor: "#444",
    padding: 10,
    borderRadius: 10,
    marginTop: 150,
    elevation: 5,
    width: "97%",
    marginLeft: "auto",
    marginRight: "auto",
    borderBlockColor: "black",
    borderWidth: 4,
  },
  selectedDayStyle: { backgroundColor: "black", borderRadius: 5 },
  selectedDayTextStyle: { color: "white" },
  calendarText: { color: "white" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00000080",
  },
  modalContent: {
    backgroundColor: "#333",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 15,
    fontFamily: "Vazir",
  },
  modalInput: {
    backgroundColor: "#444",
    color: "#fff",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  modalButton: { backgroundColor: "#4A90E2", padding: 10, borderRadius: 5 },
  modalButtonText: { color: "#fff", fontWeight: "bold" },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "red",
  },
});

export default App;
