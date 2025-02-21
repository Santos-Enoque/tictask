# 🚀 Contributing to TicTask  

Thank you for your interest in contributing to **TicTask**! 🎉 TicTask is an open-source **Pomodoro Timer & To-Do List** extension designed to help people stay productive.  

We welcome **bug reports, feature suggestions, code contributions, and documentation improvements**. Let's build something awesome together! 🚀  

---

## 📌 How to Contribute  

### 🛠️ 1. Setting Up the Project  

#### **Clone the Repository**  
```bash
git clone https://github.com/yourusername/tictask.git
cd tictask
```

#### **Install Dependencies**  
```bash
npm install  # or yarn install
```

#### **Load the Extension in Chrome**  
1. Open `chrome://extensions/` in your browser.  
2. Enable **Developer Mode** (toggle in the top-right corner).  
3. Click **"Load Unpacked"** and select the `src/static` folder.  
4. The extension should now be active!  

---

## 📂 Project Structure  

```
tictask/
├── CONTRIBUTING.md       # Contribution guidelines
├── README.md             # Project documentation
├── package.json          # Dependencies
├── postcss.config.js     # PostCSS config
├── tailwind.config.js    # Tailwind CSS config
├── tsconfig.json         # TypeScript config
├── webpack.common.js     # Webpack common config
├── webpack.dev.js        # Webpack dev config
├── webpack.prod.js       # Webpack prod config
├── src/
│   ├── background/       # Background script
│   │   └── background.ts
│   ├── components/       # UI Components
│   │   └── ui/
│   │       └── button.tsx
│   ├── contentScript/    # Content script
│   │   └── contentScript.ts
│   ├── lib/              # Utility functions
│   │   └── utils.ts
│   ├── options/          # Extension options page
│   │   ├── options.css
│   │   └── options.tsx
│   ├── popup/            # Popup UI
│   │   ├── popup.css
│   │   └── popup.tsx
│   ├── static/           # Static files (icons, manifest)
│   │   ├── icon.png
│   │   └── manifest.json
│   ├── styles/           # Global styles
│   │   └── global.css
```

---

## 🐛 2. Reporting Bugs  

If you find a bug, please **open an issue** and include:  
- A **clear description** of the issue.  
- **Steps to reproduce** the bug.  
- **Expected behavior** vs. actual behavior.  
- **Screenshots** (if applicable).  

🔗 **[Open an Issue](https://github.com/yourusername/tictask/issues/new)**  

---

## 🌟 3. Requesting a Feature  

Have an idea to improve TicTask? Before submitting a feature request:  
- **Check existing issues** to see if it’s already suggested.  
- If not, **open a new issue** and describe:  
  - **What the feature does**  
  - **Why it’s useful**  
  - **Any references or examples**  

🔗 **[Request a Feature](https://github.com/yourusername/tictask/issues/new?labels=enhancement)**  

---

## 📥 4. Submitting a Pull Request (PR)  

#### **1. Fork the Repository**  
Click the **"Fork"** button on GitHub and clone your fork:  
```bash
git clone https://github.com/yourusername/tictask.git
cd tictask
```

#### **2. Create a New Branch**  
Use a meaningful branch name:  
```bash
git checkout -b feature-name
```

#### **3. Make Your Changes & Test Locally**  
- Keep your code **clean and well-documented**.  
- Test your changes **before submitting**.  

#### **4. Commit & Push Your Changes**  
```bash
git add .
git commit -m "✨ Added feature XYZ"
git push origin feature-name
```

#### **5. Open a Pull Request**  
1. Go to **your forked repository** on GitHub.  
2. Click **"New Pull Request"**.  
3. Select `main` as the base branch and your `feature-name` branch.  
4. Add a **clear title** and **description** of your changes.  
5. Submit for review! 🎉  

🔗 **[Create a Pull Request](https://github.com/yourusername/tictask/compare)**  

---

## 🔥 Code Guidelines  

### ✅ **Code Style**  
- Use **camelCase** for variables and functions.  
- Use **PascalCase** for components and classes.  
- Keep functions **short and modular**.  

### 📝 **Commit Message Format**  
Follow **conventional commit messages**:  
```
✨ feat: Added GitHub-style focus analytics  
🐛 fix: Resolved issue with timer reset  
📝 docs: Updated README with installation guide  
🎨 style: Improved button UI for dark mode  
```

---

## 🎯 Future Improvements  

We are actively working on new features! Check the [Issues](https://github.com/yourusername/tictask/issues) tab to see what's planned next.  

Some upcoming features:  
- 🌙 **Dark Mode & Custom Themes**  
- 📊 **Advanced Productivity Reports**  
- 📅 **Google Calendar & Notion Sync**  
- 🌍 **Multi-Language Support**  

---

## 🙌 Join the Community!  

💬 **Have questions? Need help?** Join our discussions:  
🔗 **[GitHub Discussions](https://github.com/yourusername/tictask/discussions)**  
🐦 **Follow us on Twitter** [@TicTaskApp](https://twitter.com/TicTaskApp)  

---

## 📄 License  

TicTask is open-source and released under the **MIT License**. See [LICENSE](LICENSE) for details.  

---

## 🎯 Our Vision  

We believe **productivity should be simple, effective, and fun**. TicTask is **built by the community, for the community**—and **your contributions make a difference**! 🚀  

👨‍💻 **Contribute Today & Help Build the Future of Focused Work!**  

