import Sound from 'react-native-sound';

Sound.setCategory('Playback');

let sosSound: Sound | null = null;
let crashSound: Sound | null = null;
let drivingSound: Sound | null = null;

export const playSOSSound = () => {
  if (!sosSound) {
    sosSound = new Sound('sos.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('SOS sound failed to load', error);
        return;
      }
      sosSound?.play();
    });
  } else {
    sosSound.stop(() => sosSound?.play());
  }
};

export const playCrashSound = () => {
  if (!crashSound) {
    crashSound = new Sound('crash.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Crash sound failed', error);
        return;
      }
      crashSound?.play();
    });
  } else {
    crashSound.stop(() => crashSound?.play());
  }
};

export const playDrivingSound = () => {
  if (!drivingSound) {
    drivingSound = new Sound('driving.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Driving sound failed', error);
        return;
      }
      drivingSound?.play();
    });
  } else {
    drivingSound.stop(() => drivingSound?.play());
  }
};