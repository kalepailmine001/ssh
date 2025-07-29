# PassKey Manager Chrome Extension

A comprehensive Chrome extension for managing WebAuthn passkeys and enabling automatic login to websites that support passwordless authentication.

## 🔑 Features

- **Automatic Passkey Detection**: Automatically detects and intercepts WebAuthn API calls
- **Passkey Storage**: Securely stores passkey metadata locally using Chrome's storage API
- **Auto-Login**: Suggests and enables automatic login with saved passkeys
- **Beautiful UI**: Modern, intuitive popup interface for managing passkeys
- **Site-Specific Management**: View and manage passkeys per website
- **Import/Export**: Backup and restore your passkey data
- **Privacy-Focused**: All data stored locally, no external servers involved

## 📦 Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The PassKey Manager extension should now appear in your extensions list

### From Chrome Web Store

*Coming soon - extension will be published to the Chrome Web Store*

## 🚀 Usage

### Basic Usage

1. **Click the extension icon** in your browser toolbar to open the popup
2. **Visit a WebAuthn-enabled website** (like GitHub, Google, Microsoft, etc.)
3. **Create a passkey** when prompted by the website or use the "Create New Passkey" button
4. **The extension will automatically save** the passkey metadata
5. **Return to the site later** and the extension will offer to auto-login with your saved passkey

### Managing Passkeys

- **View all passkeys**: Open the extension popup and browse your saved passkeys
- **Search passkeys**: Use the search bar to find specific passkeys by name, domain, or username
- **Delete passkeys**: Click the delete button (🗑️) next to any passkey to remove it
- **Export data**: Use the Export button to download your passkeys as a JSON file
- **Import data**: Use the Import button to restore passkeys from a backup file

### Settings & Configuration

Access settings by clicking the gear icon (⚙️) in the popup header:

- **Auto-Login**: Enable/disable automatic login suggestions
- **Notifications**: Show/hide notifications for passkey operations
- **User Verification**: Require biometric verification for passkey usage
- **Timeout Duration**: Configure how long to wait for WebAuthn operations
- **Debug Mode**: Enable detailed logging for troubleshooting

## 🏗️ Architecture

The extension consists of several components:

### Core Components

- **`manifest.json`**: Extension configuration and permissions
- **`background.js`**: Service worker handling passkey storage and management
- **`content.js`**: Content script for intercepting WebAuthn calls
- **`injected.js`**: Page-context script for WebAuthn API interception
- **`popup.html/js/css`**: Main user interface
- **`options.html/js/css`**: Settings and configuration page

### Data Flow

1. **WebAuthn Interception**: `injected.js` intercepts `navigator.credentials` calls
2. **Message Passing**: Content script communicates with background service worker
3. **Storage Management**: Background script handles passkey storage/retrieval
4. **UI Updates**: Popup interface displays and manages stored passkeys

## 🔒 Security & Privacy

- **Local Storage Only**: All passkey metadata is stored locally using Chrome's storage API
- **No External Servers**: No data is transmitted to external servers or third parties
- **Metadata Only**: Only passkey metadata is stored, not the actual cryptographic keys
- **Browser Security**: Relies on Chrome's built-in WebAuthn security model
- **User Control**: Complete control over data with export/import/delete capabilities

## 🛠️ Development

### Prerequisites

- Node.js (for development tools, optional)
- Chrome browser with Developer mode enabled

### Project Structure

```
passkey-manager/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js            # Content script
├── injected.js           # Page-context script
├── popup.html            # Main popup interface
├── popup.js              # Popup functionality
├── popup.css             # Popup styles
├── options.html          # Settings page
├── options.js            # Settings functionality
├── options.css           # Settings styles
├── icons/                # Extension icons
└── README.md             # This file
```

### Testing

1. Load the extension in Chrome Developer mode
2. Visit WebAuthn-enabled sites like:
   - [webauthn.io](https://webauthn.io) - WebAuthn demo site
   - [GitHub](https://github.com) - Enable passkeys in security settings
   - [Google](https://myaccount.google.com) - 2-Step Verification settings
3. Test passkey creation and authentication flows
4. Verify data persistence and UI functionality

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Supported Websites

The extension works with any website that implements the WebAuthn standard. Popular sites include:

- **GitHub** - Enable in Security settings
- **Google** - 2-Step Verification with Security keys
- **Microsoft** - Windows Hello or Security keys
- **Apple** - Touch ID/Face ID on supported devices
- **Facebook** - Security keys in Security settings
- **Twitter** - Security keys in Account security
- **LinkedIn** - Two-step verification settings
- **Dropbox** - Security keys in Security tab
- **And many more...**

## 🐛 Troubleshooting

### Common Issues

**Extension not detecting passkeys:**
- Ensure the website supports WebAuthn
- Check that the extension has proper permissions
- Try refreshing the page after installing the extension

**Auto-login not working:**
- Verify auto-login is enabled in settings
- Check that you have saved passkeys for the current site
- Ensure the website's login flow supports WebAuthn

**Passkeys not saving:**
- Check Chrome's storage permissions
- Verify the extension is not in incognito mode
- Look for errors in the browser console (F12)

### Debug Mode

Enable debug mode in settings to see detailed logs in the browser console:

1. Open extension popup
2. Click settings (⚙️)
3. Enable "Debug Mode"
4. Check browser console (F12) for detailed logs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Acknowledgments

- Built using the [WebAuthn API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- Icons and design inspired by modern Chrome extension best practices
- Thanks to the WebAuthn community for specifications and examples

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/passkey-manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/passkey-manager/discussions)
- **Email**: support@passkeymanager.dev

## 🗺️ Roadmap

- [ ] Chrome Web Store publication
- [ ] Firefox extension port
- [ ] Passkey sync across devices
- [ ] Advanced security features
- [ ] Integration with password managers
- [ ] Enterprise features

---

**⚠️ Security Notice**: This extension is designed to enhance your WebAuthn experience. Always verify the authenticity of websites before creating passkeys and keep your browser updated for the latest security features.