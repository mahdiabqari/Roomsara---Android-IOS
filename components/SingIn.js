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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const API_URL = "https://roomsaraservernet.liara.run";

const SignUp = ({ setAuthorazation, setSignIn, setUserId, setAuth }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [codeError, setCodeError] = useState("");

  // Animation refs
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startAnimations();
  }, [step]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validateStep1 = () => {
    let isValid = true;

    // Name validation
    const nameRegex = /^[آ-یA-Za-z]{4,}$/;
    if (!nameRegex.test(name)) {
      setNameError("حداقل 4 کاراکتر و فقط حروف");
      isValid = false;
    } else {
      setNameError("");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("لطفا یک ایمیل معتبر وارد کنید");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      setPasswordError("پسورد حداقل 6 کاراکتر با حروف و عدد");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateStep1()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        setStep(2);
      } else {
        const error = await response.text();
        setPasswordError(error);
      }
    } catch (error) {
      setPasswordError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode.trim()) {
      setCodeError("لطفا کد تأیید را وارد کنید");
      return;
    }
    setCodeError("");

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verifyCode }),
      });

      if (response.ok) {
        const data = await response.json();
        const token =
          response.headers.get("Authorization") ||
          response.headers.get("authorization");

        if (!token) throw new Error("توکن دریافت نشد");

        await AsyncStorage.multiSet([
          ["AuthorizationRoomSara", token],
          ["RoomSaraID", data.userId.toString()],
        ]);

        setAuthorazation(true);
        setUserId(data.userId);
        setAuth(token);
        setSignIn(false);
      } else {
        const error = await response.text();
        Alert.alert("خطا", error);
      }
    } catch (error) {
      Alert.alert("خطا", error.message || "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const animateButton = (toValue) => {
    Animated.spring(buttonScale, {
      toValue,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const renderStep1 = () => (
    <Animated.View
      style={[
        styles.formContainer,
        {
          opacity: formOpacity,
          transform: [{ translateY: formTranslateY }],
        },
      ]}
    >
      {/* Name Input */}
      <View style={styles.inputContainer}>
        <Feather
          name="user"
          size={24}
          color="#6c757d"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="نام کامل"
          placeholderTextColor="#6c757d"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>
      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

      {/* Email Input */}
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
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      {/* Password Input */}
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
        <Text style={styles.errorText}>{passwordError}</Text>
      ) : null}

      {/* SignUp Button */}
      <TouchableOpacity
        onPressIn={() => animateButton(0.95)}
        onPressOut={() => animateButton(1)}
        onPress={handleSignUp}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.button,
            { transform: [{ scale: buttonScale }] },
            loading && styles.disabledButton,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>ادامه ثبت نام</Text>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Login Link */}
      <TouchableOpacity
        style={styles.switchContainer}
        onPress={() => {
          setSignIn(false);
        }}
      >
        <Text style={styles.switchText}>
          قبلاً حساب دارید؟ <Text style={styles.switchLink}>وارد شوید</Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View
      style={[
        styles.formContainer,
        {
          opacity: formOpacity,
          transform: [{ translateY: formTranslateY }],
        },
      ]}
    >
      {/* Verification Header */}
      <View style={styles.verifyHeader}>
        <MaterialIcons name="mark-email-read" size={40} color="#ee9b00" />
        <Text style={styles.verifyTitle}>تأیید ایمیل</Text>
        <Text style={styles.verifySubtitle}>
          کد تأیید به آدرس زیر ارسال شد:
        </Text>
        <Text style={styles.verifyEmail}>{email}</Text>
      </View>

      {/* Code Input */}
      <View style={styles.inputContainer}>
        <MaterialIcons
          name="sms"
          size={24}
          color="#6c757d"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="کد ۶ رقمی"
          placeholderTextColor="#6c757d"
          value={verifyCode}
          onChangeText={setVerifyCode}
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>
      {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}

      {/* Verify Button */}
      <TouchableOpacity
        onPressIn={() => animateButton(0.95)}
        onPressOut={() => animateButton(1)}
        onPress={handleVerify}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.button,
            { transform: [{ scale: buttonScale }] },
            loading && styles.disabledButton,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>تأیید نهایی</Text>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Back Link */}
      <TouchableOpacity
        style={styles.switchContainer}
        onPress={() => setStep(1)}
      >
        <Text style={styles.switchLink}>بازگشت به ثبت نام</Text>
      </TouchableOpacity>
    </Animated.View>
  );

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
        {/* Step Content */}
        {step === 1 ? renderStep1() : renderStep2()}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
    direction: "ltr",
  },
  formContainer: {
    backgroundColor: "rgba(39, 50, 68, 0.8)",
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
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
    color: "#cccccc",
    fontSize: 16,
    paddingVertical: 15,
    fontFamily: "Vazir",
    textAlign: "right",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 12,
    marginBottom: 10,
    marginRight: 2,
    textAlign: "right",
    fontFamily: "Vazir",
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
  switchContainer: {
    marginTop: 25,
    alignItems: "center",
  },
  switchText: {
    color: "#cccccc",
    fontSize: 14,
    fontFamily: "Vazir",
  },
  switchLink: {
    color: "#ee9b00",
    fontFamily: "Vazir",
    textDecorationLine: "underline",
  },
  verifyHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  verifyTitle: {
    color: "#ee9b00",
    fontSize: 24,
    fontFamily: "Vazir",
    marginVertical: 15,
  },
  verifySubtitle: {
    color: "#cccccc",
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Vazir",
  },
  verifyEmail: {
    color: "#ee9b00",
    fontSize: 16,
    marginTop: 10,
    fontFamily: "Vazir",
  },
});

export default SignUp;
