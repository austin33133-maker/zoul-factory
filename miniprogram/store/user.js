const { createStore } = require('./index');
const storage = require('../utils/storage');
const { STORAGE_KEYS } = require('../config/index');

const store = createStore({ token: '', userInfo: null });

function hydrate() {
  store.setState({
    token: storage.get(STORAGE_KEYS.TOKEN, ''),
    userInfo: storage.get(STORAGE_KEYS.USER_INFO, null)
  });
}

function login({ token, userInfo }) {
  storage.set(STORAGE_KEYS.TOKEN, token);
  storage.set(STORAGE_KEYS.USER_INFO, userInfo);
  store.setState({ token, userInfo });
}

function logout() {
  storage.remove(STORAGE_KEYS.TOKEN);
  storage.remove(STORAGE_KEYS.USER_INFO);
  store.setState({ token: '', userInfo: null });
}

function setUserInfo(userInfo) {
  storage.set(STORAGE_KEYS.USER_INFO, userInfo);
  store.setState({ userInfo });
}

module.exports = { ...store, hydrate, login, logout, setUserInfo };
