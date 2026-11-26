# NextStep — Engineering Study Tracker

Your daily engineering planner is hosted on [GitHub Pages](https://kdnaurunnage.github.io/Nextstep/).

**Learning tracks:** SolidWorks CAD, KiCad mini-projects, PCB tutorials, embedded electronics, control systems, and introductory flight-controller theory.

## Tablet + PC synchronization

The app includes an **optional Firebase cloud-sync integration**. It is not yet active until Firebase is configured.

See **[Cloud Sync Setup](./CLOUD_SYNC_SETUP.md)** for the one-time setup, including the private Firestore security rules. After configuration, sign in with the **same NextStep account** on your tablet and PC. Your task completion, study hours, edited lessons, and settings will synchronize when internet is available. Offline work stays saved on the device and syncs later.

## Data safety

- Your existing progress remains in browser local storage until you sign in.
- Export a backup from **Settings** before enabling sync.
- Do not commit Firebase service-account JSON, passwords, or private keys.
- Sync never writes to ChatGPT Memory or GitHub.

## GitHub Pages publishing

Repository **Settings → Pages** should remain set to **Deploy from branch → main → /(root)**. Changes to main redeploy automatically.
