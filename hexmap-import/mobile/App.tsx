import { useCallback, useEffect, useState } from "react";
import { BackHandler, StatusBar, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CharacterModal } from "./src/components/CharacterModal";
import { PinModal } from "./src/components/PinModal";
import { PlayerNameModal } from "./src/components/PlayerNameModal";
import { startGuildSync } from "./src/data/guild";
import { startSync } from "./src/data/initiative";
import type { Screen } from "./src/navigation";
import { BountyScreen } from "./src/screens/BountyScreen";
import { HomePage } from "./src/screens/HomePage";
import { ItemsScreen } from "./src/screens/ItemsScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { QuestsScreen } from "./src/screens/QuestsScreen";
import { ShopScreen } from "./src/screens/ShopScreen";
import { useStore } from "./src/store";
import { colors } from "./src/theme";

// Same identity model as the web app's localStorage key.
const PLAYER_NAME_KEY = "hexmap_player_name";

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [showNameModal, setShowNameModal] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const playerName = useStore((s) => s.playerName);
  const setPlayerName = useStore((s) => s.setPlayerName);

  useEffect(() => {
    startSync();
    startGuildSync();
    AsyncStorage.getItem(PLAYER_NAME_KEY).then((stored) => {
      if (stored) setPlayerName(stored);
    });
  }, [setPlayerName]);

  // Hardware back returns to the homepage before exiting the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen !== "home") {
        setScreen("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const persistName = useCallback(
    (name: string) => {
      setPlayerName(name);
      AsyncStorage.setItem(PLAYER_NAME_KEY, name);
    },
    [setPlayerName]
  );

  const requestName = useCallback(() => setShowNameModal(true), []);

  function openCharacter() {
    if (!playerName) setShowNameModal(true);
    else setShowCharacterModal(true);
  }

  const goHome = useCallback(() => setScreen("home"), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {screen === "home" && (
        <HomePage
          onNavigate={setScreen}
          onOpenCharacter={openCharacter}
          onEnterGm={() => setShowPinModal(true)}
        />
      )}
      {screen === "map" && (
        <MapScreen onBack={goHome} onSetPlayerName={requestName} />
      )}
      {screen === "quests" && (
        <QuestsScreen onBack={goHome} onSetPlayerName={requestName} />
      )}
      {screen === "bounty" && <BountyScreen onBack={goHome} />}
      {screen === "shop" && <ShopScreen onBack={goHome} />}
      {screen === "items" && (
        <ItemsScreen
          onBack={goHome}
          onSetPlayerName={requestName}
          onOpenCharacter={openCharacter}
        />
      )}

      <PlayerNameModal
        visible={showNameModal}
        onConfirm={(name) => {
          persistName(name);
          setShowNameModal(false);
        }}
        onClose={() => setShowNameModal(false)}
      />
      <CharacterModal
        visible={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
        onSaved={persistName}
      />
      <PinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
      />
    </View>
  );
}

export default App;
