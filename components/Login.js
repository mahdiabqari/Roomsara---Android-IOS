import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import OnboardingScreen from "./../components/----/OnboardingScreen";

const API_URL = "https://roomsaraservernet.liara.run";

const Login = ({
  setAuthorazation,
  setSignIn,
  setUserId,
  setAuth,
  setShowOnboarding,
  showOnboarding,
  setOnboardingCompleted,
  onboardingCompleted,
  userId,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // Stateهای جدید برای بازیابی رمز عبور
  const [currentStep, setCurrentStep] = useState("login"); // login, forgot, verify, reset
  const [resetCode, setResetCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timer, setTimer] = useState(120);
  const [codeSent, setCodeSent] = useState(false);

  // Animation refs
  const logoScale = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const [translateX] = useState(new Animated.Value(-40));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: passwordError || emailError ? 1 : 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: passwordError || emailError ? 0 : -40,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [passwordError, emailError, fadeAnim, translateX]);

  useEffect(() => {
    let interval;
    if (codeSent && currentStep === "verify" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [codeSent, timer, currentStep]);

  //کد بازیابی
  const handleSendCode = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("لطفـا یک ایمـیل معتبـر وارد کنیـد");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setCodeSent(true);
        setTimer(120);
        setCurrentStep("verify");
      } else {
        const error = await response.text();
        Alert.alert("خطا", error);
      }
    } catch (error) {
      Alert.alert("خطا", "خطا در ارتباط با سرور");
    } finally {
      setIsProcessing(false);
    }
  };

  // تایید کد بازیابی
  const handleVerifyCode = async () => {
    if (!resetCode) {
      Alert.alert("خطا", "لطفا کد تایید را وارد کنید");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/users/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetCode }),
      });

      if (response.ok) {
        setCurrentStep("reset");
      } else {
        const error = await response.text();
        Alert.alert("خطا", error);
      }
    } catch (error) {
      Alert.alert("خطا", "خطا در تایید کد");
    } finally {
      setIsProcessing(false);
    }
  };

  // تنظیم رمز عبور جدید
  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      Alert.alert("خطا", "رمز عبور و تکرار آن مطابقت ندارند");
      return;
    }

    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: password }),
      });

      if (response.ok) {
        Alert.alert("موفق", "رمز عبور با موفقیت تغییر کرد");
        setPassword("");
        setConfirmPassword("");
        setResetCode("");
        setCurrentStep("login");
      } else {
        const error = await response.text();
        Alert.alert("خطا", error);
      }
    } catch (error) {
      Alert.alert("خطا", "خطا در تغییر رمز عبور");
    } finally {
      setIsProcessing(false);
    }
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const checkAuth = async () => {
    const id = await AsyncStorage.getItem("RoomSaraID");
    const token = await AsyncStorage.getItem("AuthorizationRoomSara");
    if (id) {
      setAuthorazation(true);
      setAuth(token);
      setUserId(id);
    } else {
      setTimeout(() => setLoading(false), 1500);
      setShowOnboarding(true);
    }
  };

  const validateForm = () => {
    let isValid = true;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("لطفـا یک ایمـیل معتبـر وارد کنیـد");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Za-z]).{6,}$/;
    if (!passwordRegex.test(password)) {
      setPasswordError("پسـورد حداقـل 6 کاراکتر");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = response.headers.get("authorization");
        const id = data.id;

        await AsyncStorage.multiSet([
          ["AuthorizationRoomSara", token],
          ["RoomSaraID", id],
        ]);

        setAuth(token);
        setUserId(id);
        setAuthorazation(true);
      } else {
        const error = await response.text();
        setPasswordError(error);
      }
    } catch (error) {
      setPasswordError(`خطا در ارتباط با سرور`);
    } finally {
      setIsProcessing(false);
    }
  };

  const animateButton = (toValue) => {
    Animated.spring(buttonScale, {
      toValue,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handleFinishOnboarding = () => {
    setShowOnboarding(false);
    setOnboardingCompleted(false);
  };

  useEffect(() => {
    checkAuth();
    startAnimations();
  }, []);

  if (showOnboarding) {
    return <OnboardingScreen onFinish={handleFinishOnboarding} />;
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.gradient}>
        <StatusBar
          backgroundColor="transparent"
          barStyle="light-content"
          translucent
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ee9b00" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* لوگو */}
            <Animated.View
              style={[
                styles.logoContainer,
                { transform: [{ scale: logoScale }] },
              ]}
            >
              <Image
                source={require("../assets/logo.png")}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 20,
                }}
              />
            </Animated.View>

            {/* فرم ورود */}
            {currentStep === "login" && (
              <Animated.View
                style={[styles.formContainer, { opacity: formOpacity }]}
              >
                <Text style={styles.stepTitle}>ورود به حساب کاربری</Text>

                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="email"
                    size={24}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="آدرس ایمیل"
                    placeholderTextColor="#6c757d"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {emailError ? (
                  <Animated.Text
                    style={[
                      styles.errorText,
                      { opacity: fadeAnim, transform: [{ translateX }] },
                    ]}
                  >
                    {emailError}
                  </Animated.Text>
                ) : null}

                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="lock"
                    size={24}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="رمز عبور"
                    placeholderTextColor="#6c757d"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true}
                  />
                </View>
                {passwordError ? (
                  <Animated.Text
                    style={[
                      styles.errorText,
                      { opacity: fadeAnim, transform: [{ translateX }] },
                    ]}
                  >
                    {passwordError}
                  </Animated.Text>
                ) : null}

                <TouchableOpacity
                  onPressIn={() => animateButton(0.95)}
                  onPressOut={() => animateButton(1)}
                  onPress={handleLogin}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.button,
                      { transform: [{ scale: buttonScale }] },
                      isProcessing && styles.disabledButton,
                    ]}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>ورود به حساب کاربری</Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <View style={styles.linksContainer}>
                  <TouchableOpacity onPress={() => setSignIn(true)}>
                    <Text style={styles.linkText}>
                      حساب کاربری ندارید؟{" "}
                      <Text style={styles.linkHighlight}>ثبت نام کنید</Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setCurrentStep("forgot")}>
                    <Text style={styles.linkText}>
                      <Text style={styles.linkHighlight}>بازیابی رمز عبور</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* فرم بازیابی رمز عبور - مرحله 1 */}
            {currentStep === "forgot" && (
              <Animated.View
                style={[styles.formContainer, { opacity: formOpacity }]}
              >
                <Text style={styles.stepTitle}>بازیابی رمز عبور</Text>

                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="email"
                    size={24}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="آدرس ایمیل"
                    placeholderTextColor="#6c757d"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {emailError ? (
                  <Animated.Text
                    style={[
                      styles.errorText,
                      { opacity: fadeAnim, transform: [{ translateX }] },
                    ]}
                  >
                    {emailError}
                  </Animated.Text>
                ) : null}

                <TouchableOpacity
                  onPress={handleSendCode}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.button,
                      isProcessing && styles.disabledButton,
                    ]}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>ارسال کد تایید</Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <View style={styles.linksContainer}>
                  <TouchableOpacity onPress={() => setCurrentStep("login")}>
                    <Text style={styles.linkText}>
                      <Text style={styles.linkHighlight}>بازگشت به ورود</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* فرم بازیابی رمز عبور - مرحله 2 (تایید کد) */}
            {currentStep === "verify" && (
              <Animated.View
                style={[styles.formContainer, { opacity: formOpacity }]}
              >
                <Text style={styles.stepTitle}>تایید کد بازیابی</Text>

                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="vpn-key"
                    size={24}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="کد تایید"
                    placeholderTextColor="#6c757d"
                    value={resetCode}
                    onChangeText={setResetCode}
                    keyboardType="number-pad"
                  />
                </View>

                {timer > 0 && (
                  <Text style={styles.timerText}>
                    زمان باقی مانده: {timer} ثانیه
                  </Text>
                )}

                <TouchableOpacity
                  onPress={handleVerifyCode}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.button,
                      isProcessing && styles.disabledButton,
                    ]}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>تایید کد</Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>

                {timer === 0 && (
                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={isProcessing}
                  >
                    <Text style={[styles.linkText, styles.resendText]}>
                      ارسال مجدد کد
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.linksContainer}>
                  <TouchableOpacity onPress={() => setCurrentStep("forgot")}>
                    <Text style={styles.linkText}>
                      <Text style={styles.linkHighlight}>تغییر ایمیل</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* فرم بازیابی رمز عبور - مرحله 3 (تغییر رمز) */}
            {currentStep === "reset" && (
              <Animated.View
                style={[styles.formContainer, { opacity: formOpacity }]}
              >
                <Text style={styles.stepTitle}>تغییر رمز عبور</Text>

                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="lock"
                    size={24}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="رمز عبور جدید"
                    placeholderTextColor="#6c757d"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true}
                  />
                </View>
                {passwordError ? (
                  <Animated.Text
                    style={[
                      styles.errorText,
                      { opacity: fadeAnim, transform: [{ translateX }] },
                    ]}
                  >
                    {passwordError}
                  </Animated.Text>
                ) : null}

                <View style={styles.inputContainer}>
                  <MaterialIcons
                    name="lock-outline"
                    size={24}
                    color="#6c757d"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="تکرار رمز عبور جدید"
                    placeholderTextColor="#6c757d"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={true}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.button,
                      isProcessing && styles.disabledButton,
                    ]}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>تغییر رمز عبور</Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <View style={styles.linksContainer}>
                  <TouchableOpacity onPress={() => setCurrentStep("login")}>
                    <Text style={styles.linkText}>
                      <Text style={styles.linkHighlight}>بازگشت به ورود</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </ScrollView>
        )}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "screen",
    backgroundColor: "#0d1522",
    direction: "ltr", // همیشه چپ‌چین
    writingDirection: "ltr", // متن و ورودی‌ها هم چپ‌چین
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 25,
    height: "screen",
    direction: "ltr", // همیشه چپ‌چین
    writingDirection: "ltr", // متن و ورودی‌ها هم چپ‌چین
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    color: "#ee9b00",
    fontSize: 24,
    fontFamily: "Vazir",
    marginTop: 20,
    textShadowColor: "rgba(238, 155, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  formContainer: {
    backgroundColor: "rgba(39, 50, 68, 0.8)",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108, 117, 125, 0.15)",
    borderRadius: 12,
    marginVertical: 8,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    textAlign: "right",
    color: "#cccccc",
    fontSize: 16,
    fontFamily: "Vazir",

    paddingVertical: 15,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 12,
    fontFamily: "Vazir",
    marginBottom: 5,
    textAlign: "right",
    marginTop: 3,
  },
  button: {
    backgroundColor: "#ee9b00",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#ee9b00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  signupContainer: {
    marginTop: 25,
    alignItems: "center",
  },
  signupText: {
    color: "#cccccc",
    fontSize: 14,
    fontFamily: "Vazir",
  },
  signupLink: {
    color: "#ee9b00",
    fontFamily: "Vazir",
    textDecorationLine: "underline",
  },
  stepTitle: {
    color: "#ee9b00",
    fontSize: 20,
    fontFamily: "Vazir",
    marginBottom: 20,
    textAlign: "center",
    textShadowColor: "rgba(238, 155, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  formContainer: {
    backgroundColor: "rgba(39, 50, 68, 0.8)",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(108, 117, 125, 0.15)",
    borderRadius: 12,
    marginVertical: 8,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    textAlign: "right",
    color: "#cccccc",
    fontSize: 16,
    fontFamily: "Vazir",
    paddingVertical: 15,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 12,
    fontFamily: "Vazir",
    marginBottom: 5,
    textAlign: "right",
    marginTop: 3,
  },
  button: {
    backgroundColor: "#ee9b00",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#ee9b00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  linksContainer: {
    marginTop: 25,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkText: {
    color: "#cccccc",
    fontSize: 14,
    fontFamily: "Vazir",
  },
  linkHighlight: {
    color: "#ee9b00",
    fontFamily: "Vazir",
    textDecorationLine: "underline",
  },
  timerText: {
    color: "#cccccc",
    fontSize: 12,
    fontFamily: "Vazir",
    textAlign: "center",
    marginTop: 10,
  },
  resendText: {
    color: "#ee9b00",
    textAlign: "center",
    marginTop: 15,
    textDecorationLine: "underline",
  },
});

export default Login;
