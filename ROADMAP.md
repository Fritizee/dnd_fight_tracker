# 🗺️ Project Roadmap: D&D Fight Tracker

## 🌟 Vision

To create a lightweight, blazing-fast D&D 5e combat tracker that serves as a powerful local tool for the Dungeon Master, and seamlessly transforms into a companion app for physical tables. Players can simply scan a QR code to join the battle from their phone browsers—no apps, no accounts, and no VTT bloat required.

---

## 🚩 Milestone 1: Core Mechanics & DM Quality of Life

*Focus: Establishing the tracker as a standalone, flawless tool for running combat encounters.*

* **Swarm Management (Grouped Enemies):**
Add an input field for "Quantity" when creating combatants. The app will automatically generate numbered/lettered instances (e.g., *Goblin A, Goblin B*) with shared or individual initiative rolls.
* **5e SRD API Integration:**
Integrate an open API (like Open5e) with a search bar. Typing a monster's name will automatically fetch and populate its Max HP, AC, Initiative modifier, and default attack actions.
* **Conditions & Concentration Tracking:**
Implement visual badges for standard D&D conditions (Prone, Poisoned, Restrained, etc.). Add an automated Concentration tracker that triggers an alert UI for Constitution saving throws whenever a concentrating character takes damage.

---

## 🚩 Milestone 2: Session Prep & State Persistence

*Focus: Ensuring data safety during live sessions and providing tools for pre-game encounter building.*

* **Browser LocalStorage Autosave:**
Automatically serialize the `characters` array and current combat state into JSON and save it to `localStorage` on every action. This prevents data loss upon accidental page refreshes.
* **Encounter Import / Export (JSON):**
Allow the DM to build encounters ahead of time and download them as `.json` files to be loaded instantly during the session.
* **Markdown Integration:**
Add a "Copy to Markdown" feature that generates a clean markdown table of the current initiative order and HP. Perfect for dropping into local campaign managers like Obsidian or Notion.

---

## 🚩 Milestone 3: The Big Leap (Multiplayer & QR Codes)

*Focus: Transitioning from a static HTML file to a local client-server architecture for physical table sharing.*

* **Local Server & WebSockets:**
Extract the core combat logic into a Node.js backend. Implement `Socket.io` to broadcast combat events (damage, turn changes) in real-time to connected clients.
* **View Separation (DM vs. Player):**
Create a dedicated, read-only UI for players. Players will see the initiative order, active turn, and general health statuses (e.g., Healthy, Bloodied, Critical) without seeing the exact numerical HP of hidden monsters.
* **Desktop Wrapper & QR Generation:**
Package the server and DM frontend into a lightweight desktop application using **Tauri** or **Electron**. Upon launching, the app will host the server on the local Wi-Fi network (e.g., `192.168.x.x`) and automatically generate a QR code for players to scan and join instantly.

---

## 🚩 Milestone 4: Visuals & Deep Customization

*Focus: Enhancing immersion and tracking class-specific mechanics.*

* **Custom Character & NPC Avatars:**
Allow the uploading of custom token images or pixel-art miniatures for each combatant to display on the initiative track.
* **AI Avatar Generation (Optional Integration):**
Implement a prompt-to-image generator using free cloud APIs (e.g., Hugging Face Inference) or local neural networks (e.g., Stable Diffusion API). The DM can quickly generate pixel-art tokens for random, unplanned NPCs on the fly.
* **Class-Specific Resource Trackers:**
Introduce dynamic counters for specific D&D mechanics (e.g., Paladin's Lay on Hands pool, Sorcery Points, Fighter's Superiority Dice, or limited spell slots) right next to the HP calculator.