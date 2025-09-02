import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const onboardingSlides = [
  {
    image: require("../../assets/first.png"),
    title: "به روم سـرا خوش آمدید",
    description:
      "برنامه ای برای ارتباط صوتی و پیام رسانی امن و سریع با دوستان و همکاران",
  },
  {
    image: require("../../assets/voice-message.png"),
    title: "اتاق‌های صوتی حرفه‌ای",
    description:
      "با کیفیت بالا در مکالمات گروهی شرکت کنید و تجربه ارتباطی بی‌نظیری داشته باشید",
  },
  {
    image: require("../../assets/texting.png"),
    title: "پیام‌رسانی سریع",
    description:
      "پیام رسانی آسان به دوستان خود به راحتی و با سرعت و امنیت بالا",
  },
];

const OnboardingScreen = ({ onFinish }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef();

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newPage = Math.round(contentOffsetX / width);
    setCurrentPage(newPage); // به‌روزرسانی currentPage با اسکرول
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: false,
    })(event);
  };

  const handleNext = async () => {
    if (currentPage < onboardingSlides.length - 1) {
      scrollViewRef.current.scrollTo({ x: width * (currentPage + 1) });
      setCurrentPage(currentPage + 1);
    } else {
      onFinish();
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      scrollViewRef.current.scrollTo({ x: width * (currentPage - 1) });
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent
      />
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll} // جایگزینی با تابع جدید
        scrollEventThrottle={16}
      >
        {onboardingSlides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <Image source={slide.image} style={styles.image} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.pagination}>
        {onboardingSlides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 16, 8],
            extrapolate: "clamp",
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                { width: dotWidth, opacity },
                currentPage === index && styles.activeDot,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.buttonsContainer}>
        {currentPage > 0 && (
          <TouchableOpacity style={styles.button} onPress={handlePrevious}>
            <Text style={styles.buttonText}>قبلی</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentPage === onboardingSlides.length - 1 ? "شروع کنید" : "بعدی"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    direction: "ltr",
  },
  slide: {
    width,
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
    resizeMode: "contain",
    marginBottom: 40,
  },
  title: {
    color: "#ee9b00",
    fontSize: 24,
    fontFamily: "Vazir",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    color: "#cccccc",
    fontSize: 16,
    fontFamily: "Vazir",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 24,
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6c757d",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#ee9b00",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    bottom: 40,
    width: "100%",
    paddingHorizontal: 30,
  },
  button: {
    backgroundColor: "#16213e",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#6c757d",
  },
  primaryButton: {
    backgroundColor: "#ee9b00",
    borderColor: "#ee9b00",
    marginLeft: "auto",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Vazir",
  },
});

export default OnboardingScreen;
