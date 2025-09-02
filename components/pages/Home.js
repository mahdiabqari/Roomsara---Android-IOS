import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
  Modal,
  Dimensions,
  Animated,
  Clipboard,
  Pressable,
} from "react-native";
import {
  FadeInUp,
  FadeInLeft,
  ZoomIn,
  LightSpeedInLeft,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import RoomLinkModal from "./../----/RoomLinkModal";
import { Ionicons } from "@expo/vector-icons";
const API_URL = "";
const windowHeight = 500;

const HomePage = ({
  userId,
  Auth,
  setShowNavbar,
  Me,
  isCreateModalOpen,
  setIsCreateModalOpen,
  activeRooms,
  fetchRooms,
}) => {
  const [roomName, setRoomName] = useState("");
  const [roomJoinName, setRoomJoinName] = useState("");
  const [roomId, setRoomId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRoomConfirmation, setShowRoomConfirmation] = useState(false);
  const [selectedRoomLink, setSelectedRoomLink] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  const extractRoomId = (url) => {
    const match = url.match(/\/Room\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert("خطا", "لطفاً نام اتاق را وارد کنید");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/rooms/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: Auth,
        },
        body: JSON.stringify({ name: roomName, ownerId: userId }),
      });

      const data = await response.json();
      if (response.ok) {
        const extractedId = extractRoomId(data.link);
        if (extractedId) {
          setRoomId(extractedId);
          setShowModal(true); // نمایش مودال به جای باز کردن لینک
          setIsCreateModalOpen(false);
          fetchRooms();
        }
      } else {
        Alert.alert("خطا", "مشکلی در ایجاد اتاق پیش آمد");
      }
    } catch (error) {
      Alert.alert("خطا", "خطا در ارتباط با سرور");
    }
  };

  const HandleNavigateToRoom = () => {
    if (!roomJoinName.trim()) {
      Alert.alert("خطا", "لطفاً لینک اتاق را وارد کنید");
      return;
    }

    if (roomJoinName) {
      const roomUrl = roomJoinName;
      Linking.openURL(roomUrl);
    } else {
      Alert.alert("خطا", "لینک اتاق نامعتبر است");
    }
  };

  const openRoomConfirmation = (link) => {
    setSelectedRoomLink(link);
    setShowRoomConfirmation(true);

    // شروع انیمیشن‌ها
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const copyRoomLink = async (link) => {
    Clipboard.setString(link);
    Alert.alert("کپی شد!", "لینک اتاق در کلیپ‌بورد کپی شد.");
  };

  const openRoomLink = async (link) => {
    const supported = await Linking.canOpenURL(link);

    if (supported) {
      await Linking.openURL(link);
    } else {
      Alert.alert("خطا", "امکان باز کردن این لینک وجود ندارد");
    }
  };

  //////////////////////////////////////////////////////////////////

  const [buttonScale] = useState(new Animated.Value(1));
  const [buttonScale2] = useState(new Animated.Value(1));
  // تابع انیمیشن دکمه ها
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };
  const animateButton2 = () => {
    Animated.sequence([
      Animated.timing(buttonScale2, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale2, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeRoomConfirmation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowRoomConfirmation(false));
  };

  const confirmJoinRoom = () => {
    if (selectedRoomLink) {
      Linking.openURL(selectedRoomLink);
      closeRoomConfirmation();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={["#0d1522", "#1a2332"]}
        style={styles.gradientContainer}
      >
        <RoomLinkModal
          visible={showModal}
          roomId={roomId}
          onClose={() => {
            setShowModal(false);
            setRoomId(null);
          }}
        />

        {/* محتوای اصلی */}
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.mainContainer}>
            {/* هدر با طراحی مدرن */}
            <Animated.View entering={FadeInUp.duration(600).delay(200)}>
              <View style={styles.headerContainer}>
                <View style={styles.titleContainer}>
                  <Text style={styles.headerTitle}>ساختن اتاق</Text>
                  <View style={styles.orangeLine} />
                </View>
                <Text style={styles.headerSubtitle}>
                  اتاق خود را بسازید یا به یک اتاق موجود بپیوندید!
                </Text>
                <View style={styles.headerPattern} />
              </View>
            </Animated.View>

            {/* بخش دکمه‌های اصلی */}
            <Animated.View entering={ZoomIn.duration(500).delay(400)}>
              <View style={styles.contentContainer}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    gap: 20,
                    alignSelf: "center",
                  }}
                >
                  {/* دکمه ساخت اتاق با افکت نور */}
                  <TouchableOpacity
                    onPressIn={() => {
                      animateButton();
                      setIsCreateModalOpen(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Animated.View
                      style={[
                        styles.bigButton,
                        styles.createButton,
                        { transform: [{ scale: buttonScale }] },
                      ]}
                    >
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>ساخت اتاق جدید</Text>
                        <Image
                          source={require("../../assets/add.png")}
                          style={[styles.buttonIcon, styles.createIcon]}
                        />
                      </View>
                      <View style={styles.buttonGlow} />
                    </Animated.View>
                  </TouchableOpacity>

                  {/* دکمه پیوستن با افکت متفاوت */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setIsJoinModalOpen(true);
                      animateButton2();
                    }}
                  >
                    <Animated.View
                      style={[
                        styles.bigButton,
                        styles.createButton,
                        { transform: [{ scale: buttonScale2 }] },
                      ]}
                    >
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>پیوستن به اتاق</Text>
                        <Image
                          source={require("../../assets/join.png")}
                          style={[styles.buttonIcon, styles.joinIcon]}
                        />
                      </View>
                      <View style={styles.buttonGlow} />
                    </Animated.View>
                  </TouchableOpacity>
                </View>

                <View style={styles.activeRoomsContainer}>
                  <View style={styles.sectionHeader}>
                    <View
                      style={{
                        width: "15%",
                        height: 2,
                        backgroundColor: "#ee9b00",
                        marginHorizontal: 2,
                      }}
                    ></View>
                    <Text style={styles.sectionTitle}>اتـاق های شمــا</Text>
                    <View
                      style={{
                        width: "50%",
                        height: 2,
                        backgroundColor: "#ee9b00",
                        marginHorizontal: 2,
                      }}
                    ></View>
                  </View>

                  {activeRooms.length === 0 ? (
                    <View style={styles.emptyRoomContainer}>
                      <Image
                        source={require("../../assets/active-room.png")}
                        style={styles.emptyRoomIcon}
                      />
                      <Text style={styles.emptyRoomText}>
                        اتاق فعالی ندارید
                      </Text>
                    </View>
                  ) : (
                    activeRooms.map((room) => (
                      <Animated.View
                        key={room.id}
                        style={styles.roomCard}
                        entering={Animated.spring(new Animated.Value(0), {
                          toValue: 1,
                          friction: 5,
                          tension: 40,
                          useNativeDriver: true,
                        })}
                      >
                        <TouchableOpacity
                          style={styles.roomContent}
                          activeOpacity={0.8}
                          onPress={() => openRoomConfirmation(room.link)}
                        >
                          <View style={styles.roomInfo}>
                            <Text style={styles.roomName}>{room.name}</Text>

                            <View style={styles.roomMeta}>
                              <View style={styles.userCount}>
                                <Image
                                  source={require("../../assets/noneprofile.jpg")}
                                  style={styles.userIcon}
                                />
                                <Text style={styles.userCountText}>
                                  {room.users} نفر
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.copyButton}
                                onPress={() => copyRoomLink(room.link)}
                              >
                                <Ionicons
                                  name="copy"
                                  size={20}
                                  color="rgba(255, 255, 255, 0.1)"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    ))
                  )}
                </View>

                {/* بخش تبلیغات با طراحی لوکس */}
                <View style={styles.adContainer}>
                  <View style={styles.adHeader}>
                    <View style={styles.adBadge}>
                      <Text style={styles.adBadgeText}>VIP</Text>
                    </View>
                    <Text style={styles.adTitle}>فضای تبلیغاتی ویژه</Text>
                  </View>
                  <Text style={styles.adText}>
                    برند یا رویداد خود را به هزاران کاربر معرفی کنید
                  </Text>
                  <TouchableOpacity style={styles.adButton}>
                    <Text style={styles.adButtonText}>دریافت اطلاعات</Text>
                    <Image
                      source={require("../../assets/backarrow.jpg")}
                      style={styles.adButtonIcon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>

        {/* مدال ساخت اتاق جدید */}
        <Modal
          visible={isCreateModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsCreateModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
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
                  bottom: 10,
                }}
              ></View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ساخت اتاق جدید</Text>
              </View>

              <View style={styles.modalBody}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="نام اتاق را وارد کنید"
                  placeholderTextColor="#888"
                  value={roomName}
                  onChangeText={setRoomName}
                />

                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setIsCreateModalOpen(false)}
                  >
                    <Text style={styles.modalButtonText}>لغو</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleCreateRoom}
                  >
                    <Text style={styles.modalButtonText}>ساخت</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* مدال پیوستن به اتاق */}
        <Modal
          visible={isJoinModalOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsJoinModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
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
                  bottom: 10,
                }}
              ></View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>پیوستن به اتاق</Text>
              </View>

              <View style={styles.modalBody}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="لینک اتاق را وارد کنید"
                  placeholderTextColor="#888"
                  value={roomJoinName}
                  onChangeText={setRoomJoinName}
                />

                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setIsJoinModalOpen(false)}
                  >
                    <Text style={styles.modalButtonText}>لغو</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={HandleNavigateToRoom}
                  >
                    <Text style={styles.modalButtonText}>پیوستن</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showRoomConfirmation}
          transparent={true}
          animationType="none"
          onRequestClose={closeRoomConfirmation}
        >
          <Animated.View
            style={[styles.confirmationOverlay, { opacity: fadeAnim }]}
          >
            <Pressable
              style={styles.overlayPressable}
              onPress={closeRoomConfirmation}
            >
              <Animated.View
                style={[
                  styles.confirmationModal,
                  { transform: [{ translateY: slideAnim }] },
                ]}
              >
                {/* دکمه برگشت بالا سمت چپ */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={closeRoomConfirmation}
                >
                  <Ionicons name="arrow-back" size={24} color="#ee9b00" />
                </TouchableOpacity>

                {/* محتوای مدال */}
                <View style={styles.confirmationContent}>
                  <Text style={styles.confirmationTitle}>
                    آیا می‌خواهید وارد اتاق شوید؟
                  </Text>

                  <Text style={styles.confirmationText}>
                    با ورود به اتاق، به محیط گفتگو و ارتباط با سایر اعضا منتقل
                    خواهید شد
                  </Text>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={closeRoomConfirmation}
                    >
                      <Text style={styles.cancelButtonText}>لغو</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={confirmJoinRoom}
                    >
                      <Text style={styles.confirmButtonText}>
                        باز کردن در وبسایت
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    direction: "rtl",
    writingDirection: "ltr",
  },
  gradientContainer: {
    flex: 1,
    padding: 0,
    paddingTop: 17,
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingTop: 0,
  },
  mainContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  headerContainer: {
    backgroundColor: "#151f30",
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#1d2a3a",
    overflow: "hidden",
    position: "relative",
  },
  titleContainer: {
    alignItems: "flex-start",
    marginBottom: 15,
  },
  headerTitle: {
    color: "#ee9b00",
    fontSize: 28,
    textAlign: "right",
    textShadowColor: "rgba(238, 155, 0, 0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontFamily: "Vazir",
  },
  orangeLine: {
    height: 4,
    width: 140,
    backgroundColor: "#ee9b00",
    borderRadius: 2,
    marginTop: 8,
  },
  headerSubtitle: {
    color: "#a0aec0",
    fontSize: 16,
    textAlign: "right",
    lineHeight: 25,
    fontFamily: "Vazir",
    direction: "ltr",
  },
  headerPattern: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    opacity: 0.05,
    backgroundColor: "#ee9b00",
    borderRadius: 100,
    transform: [{ rotate: "180deg" }],
  },
  formContainer: {
    gap: 20,
  },
  formCard: {
    backgroundColor: "#2d3a4d",
    borderRadius: 50,
    padding: 20,
    borderWidth: 3,
    borderColor: "#333333",
    marginTop: 15,
  },
  formTitle: {
    fontFamily: "Yekan",
    color: "#fff",
    fontSize: 15,
    marginBottom: 15,
    textAlign: "right",
    backgroundColor: "#3a4659",
    marginLeft: "auto",
    marginRight: "auto",
    paddingHorizontal: 30,
    paddingVertical: 6,
    marginTop: "-50px",
    borderRadius: 10,
    position: "relative",
    bottom: 37,
    borderWidth: 3,
    borderColor: "#333333",
    fontFamily: "Vazir",
  },
  input: {
    backgroundColor: "#3a4659",
    color: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    textAlign: "right",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  buttonPrimary: {
    borderRadius: 10,
    backgroundColor: "#1d36587c",
    padding: 15,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#ee9b00",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "Vazir",
    color: "#fff",
    fontSize: 14,
  },
  roomContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    width: "100%",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
  },
  roomTitle: {
    color: "#ee9b00",
    fontSize: 24,
    marginBottom: 20,
    fontFamily: "Vazir",
  },
  roomText: {
    color: "#CCCCCC",
    fontSize: 18,
    textAlign: "center",
    fontFamily: "Vazir",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#1a2332",
    padding: 20,
    height: windowHeight * 0.8, // 75% ارتفاع صفحه
    width: "100%",
    borderTopEndRadius: 40,
    borderTopLeftRadius: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  modalTitle: {
    color: "#CCCCCC",
    fontSize: 20,
    textAlign: "left",
    flex: 1,
    marginHorizontal: 10,
    fontFamily: "Vazir",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: "#000000",
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 10,
  },
  modalInput: {
    backgroundColor: "#3a4659",
    color: "#fff",
    borderRadius: 40,
    padding: 15,
    textAlign: "right",
    fontSize: 16,
    marginBottom: 20,
    fontFamily: "Vazir",
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 0,
  },
  modalButton: {
    flex: 1,
    borderRadius: 40,
    padding: 15,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#3a4659",
  },
  confirmButton: {
    backgroundColor: "#ee9b00",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  mainContainer: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    backgroundColor: "#2d3a4d",
    borderRadius: 15,
    padding: 17,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#444",
  },
  headerTitle: {
    color: "#ee9b00",
    fontSize: 24,
    textAlign: "center",
    fontFamily: "Vazir",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  bigButton: {
    borderRadius: 18,
    padding: 0,
    marginVertical: 10,
    overflow: "hidden",
    borderWidth: 2,
    height: 80,
    flex: 0.48,
    justifyContent: "center",
    alignItems: "center",
    aspectRatio: 2.05,
  },

  createButton: {
    borderColor: "#3d2e1a",
    backgroundColor: "#1d2a3a",
  },
  joinButton: {
    borderColor: "#1a2435",
    backgroundColor: "#141e2c",
  },
  buttonContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    position: "relative",
    zIndex: 2,
    paddingVertical: 3,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: "Vazir",
  },
  buttonIcon: {
    width: 25,
    height: 25,
  },
  createIcon: {
    tintColor: "#ee9b00",
  },
  joinIcon: {
    tintColor: "#4a8cff",
  },
  buttonGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(238, 155, 0, 0.15)",
    zIndex: 1,
  },
  adContainer: {
    backgroundColor: "#151f30",
    borderRadius: 18,
    padding: 25,
    marginTop: 25,
    borderWidth: 2,
    borderColor: "#1d2a3a",
    overflow: "hidden",
    position: "relative",
    marginBottom: 15,
  },
  adHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  adBadge: {
    backgroundColor: "#ee9b00",
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  adBadgeText: {
    color: "#000",
    fontSize: 12,
    fontFamily: "Vazir",
  },
  adTitle: {
    color: "#ee9b00",
    fontSize: 18,
    fontFamily: "Vazir",
  },
  adText: {
    color: "#a0aec0",
    fontSize: 14,
    textAlign: "right",
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: "Vazir",
  },
  adButton: {
    backgroundColor: "rgba(238, 155, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(238, 155, 0, 0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  adButtonText: {
    color: "#ee9b00",
    fontSize: 14,
    fontFamily: "Vazir",
  },
  adButtonIcon: {
    width: 18,
    height: 18,
    tintColor: "#ee9b00",
    marginRight: 8,
  },
  activeRoomsContainer: {
    marginTop: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    tintColor: "#ee9b00",
    marginLeft: 10,
  },
  sectionTitle: {
    color: "#ee9b00",
    fontSize: 18,
    fontFamily: "Vazir",
    marginHorizontal: 5,
    marginBottom: 4,
  },
  roomCard: {
    backgroundColor: "#1d2a3a",
    borderRadius: 15,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a3a4d",
    shadowColor: "#ee9b00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  roomInfo: {
    flex: 1,
    flexDirection: "row",
  },
  roomName: {
    color: "#fff",
    fontSize: 18,
    textAlign: "right",
    fontFamily: "Vazir",
    marginLeft: "auto",
  },
  roomMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  userCount: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(238, 155, 0, 0.1)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  userIcon: {
    width: 18,
    height: 18,
    tintColor: "#ee9b00",
    marginLeft: 5,
  },
  userCountText: {
    color: "#ee9b00",
    fontSize: 14,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  copyIcon: {
    width: 18,
    height: 18,
    tintColor: "#CCCCCC",
    marginLeft: 5,
  },
  copyButtonText: {
    color: "#CCCCCC",
    fontSize: 14,
  },
  emptyRoomContainer: {
    backgroundColor: "#1d2a3a",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a3a4d",
  },
  emptyRoomIcon: {
    width: 60,
    height: 60,
    tintColor: "#4a5568",
    marginBottom: 0,
  },
  emptyRoomText: {
    color: "#a0aec0",
    fontSize: 16,
    textAlign: "center",
    fontFamily: "Vazir",
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayPressable: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationModal: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "#1a2332",
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: "#2c3e50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  backButton: {
    position: "absolute",
    top: 15,
    left: 15,
    padding: 8,
    zIndex: 1,
  },
  confirmationContent: {
    alignItems: "center",
    paddingTop: 15,
    marginTop: 20,
  },
  icon: {
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontFamily: "Vazir",
    color: "#ee9b00",
    textAlign: "center",
    marginBottom: 15,
  },
  confirmationText: {
    fontSize: 15,
    fontFamily: "Vazir",
    color: "#CCCCCC",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 25,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 14,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Vazir",
    color: "#E2E8F0",
  },
  confirmButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#ee9b00",
    shadowColor: "#ee9b00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: "Vazir",
    color: "#1a2332",
  },
});

export default HomePage;
