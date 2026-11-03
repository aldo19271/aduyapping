import { AnimatePresence } from 'framer-motion';
import { useApp } from './store.jsx';
import { Toast } from './components/ui.jsx';
import { Backdrop } from './components/fx.jsx';
import Landing from './screens/Landing.jsx';
import Menu from './screens/Menu.jsx';
import CreateRoom from './screens/CreateRoom.jsx';
import JoinRoom from './screens/JoinRoom.jsx';
import Shop from './screens/Shop.jsx';
import Leaderboard from './screens/Leaderboard.jsx';
import Room from './screens/Room.jsx';
import Game from './screens/Game.jsx';
import About from './screens/About.jsx';
import Admin from './screens/Admin.jsx';
import SettingsScreen from './screens/Settings.jsx';

export default function App() {
  const { state } = useApp();

  if (!state.booted) {
    return (
      <main className="screen center">
        <span className="spin big" />
      </main>
    );
  }

  let screen = state.screen;
  if ((screen === 'shop' || screen === 'leaderboard') && !state.user) screen = 'menu';
  if (screen === 'admin' && !(state.user && state.user.admin)) screen = 'menu';
  if (screen === 'room' && !state.room) screen = 'menu';
  if (screen === 'game' && !state.game) screen = state.room ? 'room' : 'menu';

  const views = {
    landing: <Landing key="landing" />,
    menu: <Menu key="menu" />,
    create: <CreateRoom key="create" />,
    join: <JoinRoom key="join" />,
    shop: <Shop key="shop" />,
    leaderboard: <Leaderboard key="leaderboard" />,
    room: <Room key="room" />,
    game: <Game key="game" />,
    about: <About key="about" />,
    admin: <Admin key="admin" />,
    settings: <SettingsScreen key="settings" />,
  };

  return (
    <>
      <Backdrop calm={screen === 'game'} />
      <AnimatePresence mode="wait">
        {views[screen] || views.menu}
      </AnimatePresence>
      <Toast />
    </>
  );
}
