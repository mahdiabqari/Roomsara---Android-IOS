import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  Image,
  Clipboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const RoomLinkModal = ({ visible, roomId, onClose }) => {
  const roomUrl = `https:///Room/${roomId}`;

  const handleCopyLink = () => {
    Clipboard.setString(roomUrl);
    alert("لینک اتاق کپی شد!");
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e"]}
          style={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>اتاق شما ساخته شد!</Text>

          <Text style={styles.infoText}>
            برای ورود به اتاق باید در وبسایت لاگین کرده باشید
          </Text>

          <TouchableOpacity
            onPress={() => Linking.openURL(roomUrl)}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>{roomUrl}</Text>
            <Image
              source={require("../../assets/share.png")}
              style={{
                width: 20,
                height: 20,
                position: "absolute",
                right: 5,
                bottom: 3,
              }}
            />
          </TouchableOpacity>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.copyButton]}
              onPress={handleCopyLink}
            >
              <Text style={styles.buttonText}>کپی لینک</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>بستن</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  modalTitle: {
    color: "#ee9b00",
    fontSize: 20,
    fontFamily: "Vazir",
    textAlign: "center",
    marginBottom: 15,
  },
  infoText: {
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 12,
    fontFamily: "Vazir",
  },
  linkContainer: {
    backgroundColor: "rgba(204,204,204,0.2)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  linkText: {
    color: "#cccccc",
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Vazir",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  copyButton: {
    backgroundColor: "#ee9b00",
  },
  closeButton: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "white",
    fontFamily: "Vazir",
  },
});

export default RoomLinkModal;
