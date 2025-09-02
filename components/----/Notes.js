import React, { useState, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
const screenWidth = Dimensions.get("window").width;
import { Ionicons } from "@expo/vector-icons";

const Notes = ({ friendNotes, API_URL, userId, setFriendNotes, auth, me }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const myNote = selectedNote?.user_id === userId;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (modalVisible) {
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
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [modalVisible]);

  const handleSaveNote = async () => {
    if (!newNote.trim()) {
      Alert.alert("خطا", "متن نوت نباید خالی باشد.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/messages/take-note/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify({ note: newNote }),
      });

      if (!res.ok) throw new Error("Failed to save note");

      // افزودن نوت جدید به لیست نوت‌ها (یا آپدیت نوت فعلی)
      const updatedNotes = [...friendNotes];
      const index = updatedNotes.findIndex((n) => n.user_id === userId);

      const newEntry = {
        user_id: userId,
        note: newNote,
        name: me.name,
        profile_image: me.profile_image,
      };

      if (index > -1) {
        updatedNotes[index] = newEntry;
      } else {
        updatedNotes.unshift(newEntry);
      }

      setFriendNotes(updatedNotes);
      setModalVisible(false);
      setNewNote("");
    } catch (error) {
      Alert.alert("خطا", "در ذخیره‌سازی نوت مشکلی پیش آمد.");
    }
  };

  const handleDeleteNote = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/delete-note/${userId}`, {
        method: "DELETE",
        headers: { Authorization: auth },
      });

      if (!res.ok) throw new Error("Failed to delete note");

      setFriendNotes(friendNotes.filter((n) => n.user_id !== userId));
      setSelectedNote(null);
      setModalVisible(false);
    } catch (error) {
      Alert.alert("خطا", "مشکلی در حذف نوت رخ داد.");
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        style={styles.notesBar}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.notesContainer}
      >
        {/* دکمه افزودن نوت جدید */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={["#ee9b00", "#ffaa33"]}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={28} color="#1a2332" />
          </LinearGradient>
        </TouchableOpacity>

        {/* لیست نوت‌ها */}
        {friendNotes.map((note, index) => (
          <TouchableOpacity
            key={`${note.user_id}-${index}`}
            onPress={() => setSelectedNote(note)}
            activeOpacity={0.8}
          >
            <Animated.View style={styles.noteContainer}>
              <LinearGradient
                colors={["#ee9b00", "#ffaa33"]}
                style={styles.noteGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.noteItem}>
                  <Image
                    source={
                      note.profile_image
                        ? { uri: `${API_URL}/${note.profile_image}` }
                        : require("../../assets/noneprofile.jpg")
                    }
                    style={styles.noteProfile}
                  />
                </View>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* مدال ثبت نوت جدید */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.bottomSheet}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Animated.View
              style={[
                styles.bottomSheetContent,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>نوت جدید</Text>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={28} color="#CCCCCC" />
                </TouchableOpacity>
              </View>

              {/* Text Input */}
              <TextInput
                style={styles.input}
                value={newNote}
                placeholder="نوت خود را اینجا بنویسید..."
                placeholderTextColor="#888"
                onChangeText={setNewNote}
                multiline
                maxLength={200}
                autoFocus
              />

              <View style={styles.charCounter}>
                <Text style={styles.counterText}>{newNote.length}/200</Text>
              </View>

              {/* Save Button */}
              <Pressable
                style={[
                  styles.saveButton,
                  !newNote.trim() && styles.disabledButton,
                ]}
                onPress={handleSaveNote}
                disabled={!newNote.trim()}
              >
                <LinearGradient
                  colors={
                    !newNote.trim() ? ["#555", "#777"] : ["#ee9b00", "#ffaa33"]
                  }
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.saveText}>ذخیره نوت</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* مدال نمایش نوت کامل */}
      <Modal
        visible={!!selectedNote}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNote(null)}
      >
        <View style={styles.modalBackground}>
          {selectedNote && (
            <Animated.View style={[styles.fullNoteModal]}>
              <LinearGradient
                colors={["#1a2332", "#0f1520"]}
                style={styles.fullNoteGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.noteHeader}>
                  <Image
                    source={
                      selectedNote.profile_image
                        ? { uri: `${API_URL}/${selectedNote.profile_image}` }
                        : require("../../assets/noneprofile.jpg")
                    }
                    style={styles.fullNoteImage}
                  />
                  <Text style={styles.fullNoteName}>{selectedNote.name}</Text>
                  <TouchableOpacity
                    style={[styles.backButton, { marginRight: "auto" }]}
                    onPress={() => setSelectedNote(null)}
                  >
                    <Ionicons name="close" size={28} color="#CCCCCC" />
                  </TouchableOpacity>
                </View>

                <View style={styles.noteContent}>
                  <Text style={styles.fullNoteText}>
                    {selectedNote.note
                      .split(/(https?:\/\/[^\s]+)/g)
                      .map((part, i) =>
                        part.match(/^https?:\/\/[^\s]+$/) ? (
                          <Text
                            key={i}
                            style={{ color: "#4da6ff" }}
                            onPress={() => Linking.openURL(part)}
                          >
                            {part}
                          </Text>
                        ) : (
                          <Text key={i}>{part}</Text>
                        )
                      )}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  {myNote && (
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={handleDeleteNote}
                    >
                      <Ionicons name="trash" size={20} color="#FF6B6B" />
                      <Text style={styles.deleteText}>حذف نوت</Text>
                    </Pressable>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const colors = {
  background: "#1a2332",
  blue: "#0f4c75",
  orange: "#ff8c42",
  lightText: "#ccc",
  border: "#2c3e50",
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2332",
    marginLeft: "auto",
  },
  notesBar: {
    flexDirection: "row",
  },
  notesContainer: {
    paddingVertical: 5,
  },
  noteContainer: {
    marginRight: 15,
    alignItems: "center",
    maxWidth: 80,
    overflow: "visible",
  },
  noteGradient: {
    width: 65,
    height: 65,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#ee9b00",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  noteItem: {
    width: 61,
    height: 61,
    borderRadius: 32,
    backgroundColor: "#1a2332",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0f1520",
  },
  noteProfile: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  noteText: {
    color: "#CCCCCC",
    fontSize: 11,
    fontFamily: "Vazir",
    textAlign: "center",
    marginTop: 3,
    position: "absolute",
    top: -7,
    left: 0,
    right: 20,
    backgroundColor: "#1a2332",
    paddingVertical: 2,
    width: 49,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 5,
    zIndex: 2, // بالاتر از تصویر پروفایل
    paddingHorizontal: 2,
    paddingVertical: 3,
    lineHeight: 14,
    borderWidth: 1,
    paddingTop: 6,
  },
  noteTextName: {
    color: "#CCCCCC",
    fontSize: 10,
    fontFamily: "Vazir",
    textAlign: "center",
    marginTop: 2,
  },
  addButton: {
    width: 66,
    height: 66,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    shadowColor: "#ee9b00",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  addButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  bottomSheet: {
    backgroundColor: "rgba(26, 35, 50, 0.95)",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    width: "100%",
    paddingTop: 15,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: "#2c3e50",
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  backButton: {
    padding: 5,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Vazir",
    color: "#ee9b00",
    textAlign: "left",
    marginRight: 10,
  },
  input: {
    backgroundColor: "rgba(15, 21, 32, 0.7)",
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    fontFamily: "Vazir",
    color: "#CCCCCC",
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#2c3e50",
  },
  charCounter: {
    alignSelf: "flex-end",
    marginTop: 5,
  },
  counterText: {
    color: "#888",
    fontSize: 12,
    fontFamily: "Vazir",
  },
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveText: {
    color: "#1a2332",
    fontSize: 16,
    fontFamily: "Vazir",
  },
  fullNoteModal: {
    width: screenWidth * 0.85,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  fullNoteGradient: {
    padding: 25,
  },
  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  fullNoteImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#ee9b00",
  },
  fullNoteName: {
    fontSize: 17,
    fontFamily: "Vazir",
    color: "#ee9b00",
  },
  noteContent: {
    backgroundColor: "rgba(15, 21, 32, 0.5)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2c3e50",
  },
  fullNoteText: {
    fontSize: 16,
    fontFamily: "Vazir",
    color: "#CCCCCC",
    lineHeight: 26,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: "rgba(217, 83, 79, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(217, 83, 79, 0.5)",
    width: "100%",
    justifyContent: "center",
  },
  deleteText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontFamily: "Vazir",
    marginRight: 8,
    textAlign: "center",
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.5)",
  },
  cancel: {
    fontSize: 14,
    fontFamily: "Vazir",
    color: "#CCCCCC",
  },
});

export default Notes;
