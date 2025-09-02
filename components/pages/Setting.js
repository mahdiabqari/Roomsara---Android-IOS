import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  BackHandler,
  Linking,
  Animated,
  Share,
  Easing,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const API_URL = "";
const Setting = ({
  me,
  userId,
  Auth,
  setMe,
  setAuthorazation,
  setActiveTab,
  setUnread,
  setFriendNotes,
  setUsers,
}) => {
  const [currentSetting, setCurrentSetting] = useState("main");
  const [selectedImage, setSelectedImage] = useState(null);
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateX] = useState(new Animated.Value(-40));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: error || success ? 1 : 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: error || success ? 0 : -40,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [error, success, fadeAnim, translateX]);

  //Back Button
  useEffect(() => {
    const handleBackPress = () => {
      if (
        currentSetting === "changepic" ||
        currentSetting === "notif" ||
        currentSetting === "changePass"
      ) {
        setCurrentSetting("main");
        setSuccess("");
        setError("");
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
  }, [currentSetting]);

  // هر بار که مقدار error یا success تغییر کند، یک تایمر 8 ثانیه‌ای برای پاک کردن آن تنظیم می‌شود.
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const pickImage = async () => {
    // باز کردن گالری
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  //آپلود پروفایل
  const handleSaveProfilePic = async () => {
    if (!selectedImage) {
      setError("لطفا یک تصویر انتخاب کنید!");
      return;
    }

    const formData = new FormData();
    formData.append("profilePic", {
      uri: selectedImage,
      name: "profile.jpg",
      type: "image/jpeg",
    });
    formData.append("userId", userId);

    try {
      const response = await fetch(`${API_URL}/users/secret/upload-profile`, {
        method: "POST",
        headers: {
          Authorization: Auth,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMe({ ...me, profile_image: selectedImage });
        setSuccess("تصویر پروفایل با موفقیت تغییر یافت");
        setError("");
      } else {
        setError("مشکلی در آپلود تصویر رخ داد");
      }
    } catch (err) {
      setError("مشکلی در آپلود تصویر رخ داد");
    }
  };

  // تغییر نام کاربری
  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setError("لطفاً یک نام کاربری وارد کنید");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/users/secret/ChangeUserName`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: Auth,
        },
        body: JSON.stringify({
          userId: userId,
          NewUserName: username,
        }),
      });

      // دریافت متن پاسخ
      const textResponse = await response.text();
      let data;
      try {
        // بررسی می‌کنیم که آیا پاسخ JSON است
        data = JSON.parse(textResponse);
      } catch (jsonError) {
        console.warn("⚠️ پاسخ سرور JSON نیست. متن دریافت‌شده:", textResponse);
        if (response.ok) {
          setMe({ ...me, name: username });
          setSuccess("نام کاربری با موفقیت تغییر یافت");
          setError("");
        } else {
          setError(textResponse || "مشکلی در تغییر نام کاربری رخ داد");
        }
        return;
      }
      if (response.ok) {
        setMe((prev) => ({ ...prev, name: username }));
        setSuccess("نام کاربری با موفقیت تغییر یافت");
        setError("");
      } else {
        setError(data.message || "مشکلی در تغییر نام کاربری رخ داد");
      }
    } catch (err) {
      console.error("⚠️ خطا در تغییر نام کاربری:", err);
      setError("مشکلی در ارتباط با سرور رخ داد");
    }
  };

  // تغییر رمز عبور
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("رمز عبور جدید و تکرار آن مطابقت ندارد");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/secret/ChangePassword`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: Auth,
        },
        body: JSON.stringify({
          userId: userId,
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("رمز عبور با موفقیت تغییر یافت");
        setError("");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError("اطلاعات وارد شده نادرست است");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    }
  };

  const handleLogoutConfirm = async () => {
    await AsyncStorage.removeItem("AuthorizationRoomSara");
    await AsyncStorage.removeItem("RoomSaraID");
    await AsyncStorage.removeItem(`messages_${receiverId}`);
    setAuthorazation(false);
  };

  // خروج از حساب
  const LogoutModal = ({ visible, onClose, onLogout, receiverId }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const [countdown, setCountdown] = useState(5); // شمارش معکوس ۵ ثانیه

    // انیمیشن‌های ورود و خروج مدال
    useEffect(() => {
      if (visible) {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // شروع شمارش معکوس
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              handleConfirmLogout();
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer); // پاکسازی تایمر
      } else {
        setCountdown(5); // ریست شمارش معکوس موقع بستن مودال
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [visible]);

    // انیمیشن فشار دکمه
    const animateButtonPress = (buttonAnim, callback) => {
      if (typeof Vibration !== "undefined") {
        Vibration.vibrate(50);
      }
      Animated.sequence([
        Animated.timing(buttonAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.elastic(1.5),
          useNativeDriver: true,
        }),
      ]).start(() => {
        callback && callback();
      });
    };

    const handleConfirmLogout = async () => {
      try {
        await AsyncStorage.removeItem("AuthorizationRoomSara");
        await AsyncStorage.removeItem("RoomSaraID");
        await AsyncStorage.removeItem(`messages_${receiverId}`);
        await AsyncStorage.removeItem("cached_users");
        setAuthorazation(false);
        setActiveTab("Home");
        setFriendNotes([]);
        setUnread(false);
        setUsers([]);
      } catch (err) {
        console.error("خطا در خروج از حساب:", err);
      }
    };

    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Animated.View
            style={[
              styles.modalContainer,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <LinearGradient
              colors={["#1a2332", "#1a2332", "#1a2332", "#0f1520"]}
              style={styles.gradientContainer}
            >
              <Text style={styles.title}>خروج از حساب کاربری</Text>
              <Text style={styles.message}>
                شما در حال خروج هستید. این فرآیند در {countdown} ثانیه به‌صورت
                خودکار انجام می‌شود.
              </Text>
              <View style={styles.buttonGroup}>
                <Animated.View
                  style={[
                    styles.cancelButton,
                    { transform: [{ scale: buttonScale }] },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      animateButtonPress(buttonScale, onClose);
                    }}
                    style={styles.cancelButtonInner}
                  >
                    <Text style={styles.cancelButtonText}>انصراف</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#A0AEC0" />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  const handleLogout = () => {
    setIsLogoutModalVisible(true);
  };

  const handleModalClose = () => {
    setIsLogoutModalVisible(false);
  };

  const ShareButton = () => {
    const [scaleAnim] = React.useState(new Animated.Value(1));

    const handleShare = async () => {
      const shareOptions = {
        title: "اشتراک‌گذاری روم سرا",
        message:
          "یه برنامه جالب برای ارتباط صوتی و چت! امتحان کن: https://roomsara.liara.run",
        url: "https://roomsara.liara.run",
      };

      try {
        await Share.share(shareOptions);
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 150,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        console.log("Error sharing:", error);
      }
    };

    return (
      <TouchableOpacity onPress={handleShare} activeOpacity={0.8}>
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            padding: 8,
            borderRadius: 15,
            backgroundColor: "#1a2332",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
            width: 50,
            height: 50,
            position: "absolute",
          }}
        >
          <LinearGradient
            colors={["#1a2332", "#1a2332"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              padding: 8,
              borderRadius: 15,
              alignItems: "center",
            }}
          >
            <Ionicons name="share-social" size={20} color="#ee9b00" />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderMainSettings = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <ShareButton />

      <View style={styles.profileSection}>
        <Image
          source={
            me.profile_image
              ? { uri: `${API_URL}/${me.profile_image}` }
              : require("../../assets/noneprofile.jpg")
          }
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>{me.name}</Text>
      </View>

      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => setCurrentSetting("changepic")}
      >
        <Ionicons name="person" size={24} color="#CCCCCC" />
        <Text style={styles.settingText}>تغییر پروفایل</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => setCurrentSetting("changePass")}
      >
        <Ionicons name="lock-closed" size={24} color="#CCCCCC" />
        <Text style={styles.settingText}>امنیت و حریم خصوصی</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => setCurrentSetting("terms")}
      >
        <Ionicons name="documents" size={24} color="#CCCCCC" />
        <Text style={styles.settingText}>شرایط و قوانین</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => Linking.openURL("https://roomsara.liara.run")}
      >
        <Ionicons name="information" size={24} color="#CCCCCC" />
        <Text style={styles.settingText}>درباره مـا</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
        <Ionicons name="exit" size={24} color="#CCCCCC" />
        <Text style={[styles.settingText, { color: "#CCCCCC" }]}>خروج</Text>
      </TouchableOpacity>

      <View>
        <Text
          style={{
            textAlign: "center",
            marginTop: 2,
            color: "#000000",
            fontFamily: "Vazir",
          }}
        >
          © 2025 روم سرا. نسخه دمو
        </Text>
      </View>
    </ScrollView>
  );

  const renderTerms = () => {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        {/* دکمه بازگشت */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentSetting("main")}
        >
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        {/* عنوان بخش */}
        <View style={styles.header}>
          <Text style={styles.title}>شرایط و قوانین</Text>
        </View>

        {/* متن قوانین */}
        <View style={styles.rulesContainer}>
          {/* قانون ۱ */}
          <View style={styles.ruleItem}>
            <Image
              source={require("../../assets/verified.png")}
              style={styles.ruleIcon}
            />
            <Text style={styles.ruleText}>
              کاربران موظفند از اطلاعات شخصی خود محافظت کنند و آن را در اختیار
              دیگران قرار ندهند.
            </Text>
          </View>

          {/* قانون ۲ */}
          <View style={styles.ruleItem}>
            <Image
              source={require("../../assets/verified.png")}
              style={styles.ruleIcon}
            />
            <Text style={styles.ruleText}>
              هرگونه سوء‌استفاده از پلتفرم ممنوع است و منجر به مسدودی حساب
              کاربری می‌شود.
            </Text>
          </View>

          {/* قانون ۳ */}
          <View style={styles.ruleItem}>
            <Image
              source={require("../../assets/verified.png")}
              style={styles.ruleIcon}
            />
            <Text style={styles.ruleText}>
              در صورت مشاهده هرگونه مشکل یا باگ، آن را از طریق پشتیبانی گزارش
              دهید.
            </Text>
          </View>

          {/* قانون ۴ */}
          <View style={styles.ruleItem}>
            <Image
              source={require("../../assets/verified.png")}
              style={styles.ruleIcon}
            />
            <Text style={styles.ruleText}>
              پیام ها هر ماه و اتاق ها هر روز به صورت خودکار پاک می شوند لطفا از
              اطلاعات مهم خود مواظبت کنید.
            </Text>
          </View>

          {/* قانون ۵ */}
          <View style={styles.ruleItem}>
            <Image
              source={require("../../assets/verified.png")}
              style={styles.ruleIcon}
            />
            <Text style={styles.ruleText}>
              کاربران موظفند قوانین و مقررات را به‌طور کامل مطالعه و رعایت کنند.
            </Text>
          </View>
        </View>

        {/* دکمه بستن */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => setCurrentSetting("main")}
        >
          <Text style={styles.closeButtonText}>بستن</Text>
          <Ionicons
            name="close"
            size={18}
            color="white"
            style={styles.closeIcon}
          />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderChangePic = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setSuccess("");
          setError("");
          setCurrentSetting("main");
        }}
      >
        <Ionicons name="arrow-back" size={28} color="black" />
      </TouchableOpacity>

      <Text
        style={[
          styles.sectionTitle,
          { marginBottom: 0, position: "relative", bottom: 7 },
        ]}
      >
        تغییر پروفایل
      </Text>

      <View
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          width: "100%",
          marginVertical: 15,
          direction: "rtl",
        }}
      >
        <View
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            width: "50%",
            position: "relative",
            top: 20,
            direction: "rtl",
          }}
        >
          <TouchableOpacity
            style={[styles.saveButton, { marginBottom: 20, width: "100%" }]}
            onPress={pickImage}
          >
            <Text style={styles.buttonText}>انتخاب تصویر</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                marginBottom: 70,
                width: "100%",
                borderLeftColor: "#CCCCCC",
                backgroundColor: "#1a2332",
              },
            ]}
            onPress={handleSaveProfilePic}
          >
            <Text style={styles.buttonText}>ذخیره تصویر</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {selectedImage ? (
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
            />
          ) : (
            <Ionicons name="camera" size={50} color="#888" />
          )}
        </TouchableOpacity>
      </View>

      <Text
        style={[
          styles.sectionTitle,
          { marginBottom: 10, position: "relative", bottom: 7 },
        ]}
      >
        تغییر نام کاربری
      </Text>

      <TextInput
        style={styles.input}
        placeholder="نام کاربری جدید"
        value={username}
        onChangeText={setUsername}
        placeholderTextColor="#888"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveUsername}>
        <Text style={styles.buttonText}>ذخیره نام کاربری</Text>
      </TouchableOpacity>

      {error ? (
        <Animated.Text
          style={[
            styles.errorText,
            { opacity: fadeAnim, transform: [{ translateX }] },
          ]}
        >
          {error}
        </Animated.Text>
      ) : null}
      {success ? (
        <Animated.Text
          style={[
            styles.successText,
            { opacity: fadeAnim, transform: [{ translateX }] },
          ]}
        >
          {success}
        </Animated.Text>
      ) : null}
    </ScrollView>
  );

  const renderChangePassword = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setSuccess("");
          setError("");
          setCurrentSetting("main");
        }}
      >
        <Ionicons name="arrow-back" size={28} color="black" />
      </TouchableOpacity>

      <Text
        style={[
          styles.sectionTitle,
          { marginBottom: 40, position: "relative", bottom: 7, right: 10 },
        ]}
      >
        تغییر رمز عبور
      </Text>

      <TextInput
        style={styles.input}
        placeholder="رمز عبور فعلی"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholderTextColor="#888"
      />

      <TextInput
        style={styles.input}
        placeholder="رمز عبور جدید"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
        placeholderTextColor="#888"
      />

      <TextInput
        style={styles.input}
        placeholder="تکرار رمز عبور جدید"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholderTextColor="#888"
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleChangePassword}
      >
        <Text style={styles.buttonText}>ذخیره تغییرات</Text>
      </TouchableOpacity>

      {error ? (
        <Animated.Text
          style={[
            styles.errorText,
            { opacity: fadeAnim, transform: [{ translateX }] },
          ]}
        >
          {error}
        </Animated.Text>
      ) : null}
      {success ? (
        <Animated.Text
          style={[
            styles.successText,
            { opacity: fadeAnim, transform: [{ translateX }] },
          ]}
        >
          {success}
        </Animated.Text>
      ) : null}
    </ScrollView>
  );

  return (
    <LinearGradient
      colors={["#1a2332", "#1a2332"]}
      style={styles.mainContainer}
    >
      <View
        style={{
          width: "95%",
          marginHorizontal: "auto",
          paddingVertical: 10,
          backgroundColor: "#1d2a3a",
          paddingHorizontal: 20,
          borderRadius: 20,

          height: "90%",
        }}
      >
        {currentSetting === "main" && renderMainSettings()}
        {currentSetting === "changepic" && renderChangePic()}
        {currentSetting === "changePass" && renderChangePassword()}
        {currentSetting === "terms" && renderTerms()}
        <LogoutModal
          visible={isLogoutModalVisible}
          onClose={handleModalClose}
          onLogout={handleLogoutConfirm}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    paddingTop: 35,
    width: "100%",
    direction: "rtl", // همیشه چپ‌چین
    writingDirection: "rtl", // متن و ورودی‌ها هم چپ‌چین
  },
  container: {
    paddingBottom: 20,
    paddingTop: 20,
    direction: "rtl", // همیشه چپ‌چین
    writingDirection: "rtl", // متن و ورودی‌ها هم چپ‌چین
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 18,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 5,
  },
  profileName: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Vazir",
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderColor: "#2d3a4d",
    paddingLeft: 20,
    paddingRight: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2332",
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: "#ee9b00",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  settingText: {
    color: "#fff",
    fontSize: 16,
    marginRight: 15,
    fontFamily: "Vazir",
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 2,
    zIndex: 1,
    backgroundColor: "#CCCCCC",
    padding: 4,
    borderRadius: 10,
    direction: "rtl",
  },
  sectionTitle: {
    color: "#CCCCCC",
    fontSize: 20,
    fontFamily: "Vazir",
    marginBottom: 20,
    textAlign: "left",
  },
  imagePicker: {
    width: 150,
    height: 150,
    borderRadius: 50,
    backgroundColor: "#2d3a4d",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
    borderColor: "#333333",
    borderWidth: 3,
    marginRight: "auto",
    marginLeft: "auto",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  input: {
    backgroundColor: "#2d3a4d",
    color: "#fff",
    borderRadius: 20,
    padding: 13,
    marginBottom: 15,
    textAlign: "right",
    borderColor: "#333333",
    borderWidth: 3,
    fontFamily: "Vazir",
    fontSize: 14,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2332",
    borderRadius: 16,
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: "#ee9b00",
    justifyContent: "center",
  },
  buttonText: {
    color: "#CCCCCC",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  errorText: {
    color: "#ff4444",
    textAlign: "center",
    marginTop: 14,
    fontFamily: "Vazir",
  },
  successText: {
    color: "#4CAF50",
    textAlign: "center",
    marginTop: 14,
    fontFamily: "Vazir",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2d3a4d",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    height: 60,
  },
  switchLabel: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 50,
  },
  title: {
    fontSize: 22,
    color: "#CCCCCC",
    fontFamily: "Vazir",
  },
  rulesContainer: {
    marginBottom: 30,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  ruleIcon: {
    width: 20,
    height: 20,
    marginTop: 3,
    marginLeft: 10,
  },
  ruleText: {
    flex: 1,
    fontSize: 15,
    color: "#CCCCCC",
    lineHeight: 24,
    fontFamily: "Vazir",
    textAlign: "left",
  },
  closeButton: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Vazir",
    marginBottom: 4,
  },
  closeIcon: {
    marginRight: 8,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 20,
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  gradientContainer: {
    padding: 30,
    alignItems: "center",
    position: "relative",
  },
  animationContainer: {
    width: 140,
    height: 140,
    marginBottom: 15,
  },
  animation: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 20,
    color: "#FFF",
    fontFamily: "Vazir",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#CBD5E0",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 25,
    fontFamily: "Vazir",
  },
  confirmationContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  confirmationText: {
    fontSize: 14,
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
    fontFamily: "Vazir",
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
    overflow: "hidden",
  },
  cancelButtonInner: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 17,
    color: "#E2E8F0",
    fontFamily: "Vazir",
  },
  logoutButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#ee9b00",
    shadowColor: "#ee9b00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
  },
  logoutButtonInner: {
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    fontSize: 17,
    color: "#FFF",
    marginRight: 8,
    fontFamily: "Vazir",
  },
  cancelLink: {
    marginTop: 20,
  },
  cancelLinkText: {
    fontFamily: "Vazir",
    fontSize: 15,
    color: "#A0AEC0",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});

export default Setting;
