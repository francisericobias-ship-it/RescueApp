import BackgroundService from 'react-native-background-actions';

let triggerTime: number | null = null;
let alreadySent = false;

const sleep = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

/* 🔥 MAIN BACKGROUND TASK */
const crashTask = async (taskData: any) => {
  const { delay, onSendSOS } = taskData;

  triggerTime = Date.now() + delay;
  alreadySent = false;

  console.log("🚀 Background crash monitoring started");

  while (BackgroundService.isRunning()) {
    if (triggerTime && !alreadySent && Date.now() >= triggerTime) {
      console.log("🚨 AUTO SOS TRIGGERED (BACKGROUND)");

      alreadySent = true;

      try {
        await onSendSOS(); // 🔥 CALL YOUR FUNCTION
      } catch (e) {
        console.log("SOS ERROR:", e);
      }
    }

    await sleep(1000);
  }
};

/* 🔥 START SERVICE */
export const startCrashService = async (onSendSOS: () => Promise<void>) => {
  const options = {
    taskName: 'RescueLink',
    taskTitle: 'Crash Detection Active',
    taskDesc: 'Monitoring for crashes in background',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    parameters: {
      delay: 10000, // 10 seconds
      onSendSOS,
    },
  };

  await BackgroundService.start(crashTask, options);
};

/* 🔥 STOP SERVICE */
export const stopCrashService = async () => {
  await BackgroundService.stop();
};