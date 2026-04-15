import NetInfo from '@react-native-community/netinfo';

export const checkInternet = async () => {

  const state = await NetInfo.fetch();

  return state.isConnected;

};