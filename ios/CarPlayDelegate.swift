import CarPlay
import UIKit
import WebKit

class CarPlayViewController: UIViewController {
    var webView: WKWebView?
    var cursorView: UIView?
    var cursorPosition = CGPoint(x: 400, y: 240) // Default center
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
    }
    
    // Capture BMW Knob / Hardware Button Presses
    override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        for press in presses {
            switch press.type {
            case .select: // Knob Click (Enter)
                simulateClick()
            case .upArrow:
                moveCursor(dx: 0, dy: -30)
            case .downArrow:
                moveCursor(dx: 0, dy: 30)
            case .leftArrow:
                moveCursor(dx: -30, dy: 0)
            case .rightArrow:
                moveCursor(dx: 30, dy: 0)
            default:
                super.pressesBegan(presses, with: event)
            }
        }
    }
    
    // Support for Rotary Knob turning and directional pushes via KeyCommands
    override var keyCommands: [UIKeyCommand]? {
        return [
            UIKeyCommand(input: UIKeyCommand.inputUpArrow, modifierFlags: [], action: #selector(handleKey)),
            UIKeyCommand(input: UIKeyCommand.inputDownArrow, modifierFlags: [], action: #selector(handleKey)),
            UIKeyCommand(input: UIKeyCommand.inputLeftArrow, modifierFlags: [], action: #selector(handleKey)),
            UIKeyCommand(input: UIKeyCommand.inputRightArrow, modifierFlags: [], action: #selector(handleKey)),
            UIKeyCommand(input: "\r", modifierFlags: [], action: #selector(handleKey)) // Enter
        ]
    }
    
    @objc func handleKey(_ command: UIKeyCommand) {
        switch command.input {
        case UIKeyCommand.inputUpArrow: moveCursor(dx: 0, dy: -40)
        case UIKeyCommand.inputDownArrow: moveCursor(dx: 0, dy: 40)
        case UIKeyCommand.inputLeftArrow: moveCursor(dx: -40, dy: 0)
        case UIKeyCommand.inputRightArrow: moveCursor(dx: 40, dy: 0)
        case "\r": simulateClick()
        default: break
        }
    }
    
    func moveCursor(dx: CGFloat, dy: CGFloat) {
        cursorPosition.x = max(0, min(view.bounds.width, cursorPosition.x + dx))
        cursorPosition.y = max(0, min(view.bounds.height, cursorPosition.y + dy))
        
        UIView.animate(withDuration: 0.2) {
            self.cursorView?.center = self.cursorPosition
        }
    }
    
    func simulateClick() {
        guard let webView = webView else { return }
        let js = "document.elementFromPoint(\(Int(cursorPosition.x)), \(Int(cursorPosition.y)))?.click();"
        webView.evaluateJavaScript(js, completionHandler: nil)
        
        // Visual feedback for click
        UIView.animate(withDuration: 0.1, animations: {
            self.cursorView?.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
        }) { _ in
            UIView.animate(withDuration: 0.1) {
                self.cursorView?.transform = .identity
            }
        }
    }
}

class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    var window: UIWindow?
    var interfaceController: CPInterfaceController?
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didConnect interfaceController: CPInterfaceController, to window: CPWindow) {
        self.interfaceController = interfaceController
        self.window = window
        
        let rootVC = CarPlayViewController()
        
        // 1. Setup WebView
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // Ported Cleaners
        let js = """
        (function() {
            function cleanup() {
                if (window.location.hostname.includes('youtube.com')) {
                    ['masthead-container', 'secondary', 'survey', 'below', 'chat', 'masthead-ad'].forEach(id => {
                        const el = document.getElementById(id); if (el) el.style.display = 'none';
                    });
                }
                document.querySelectorAll('video').forEach(v => v.setAttribute('playsinline', 'true'));
            }
            cleanup();
            new MutationObserver(cleanup).observe(document, { childList: true, subtree: true });
        })();
        """
        config.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentEnd, forMainFrameOnly: false))
        
        let webView = WKWebView(frame: window.bounds, configuration: config)
        webView.load(URLRequest(url: URL(string: "https://www.youtube.com")!))
        rootVC.view.addSubview(webView)
        rootVC.webView = webView
        
        // 2. Virtual Cursor (Now controllable by Knob)
        let cursor = UIView(frame: CGRect(x: 0, y: 0, width: 25, height: 25))
        cursor.backgroundColor = .systemRed.withAlphaComponent(0.9)
        cursor.layer.cornerRadius = 12.5
        cursor.layer.borderWidth = 3
        cursor.layer.borderColor = UIColor.white.cgColor
        cursor.layer.shadowColor = UIColor.black.cgColor
        cursor.layer.shadowOpacity = 0.5
        cursor.layer.shadowRadius = 5
        rootVC.view.addSubview(cursor)
        cursor.center = rootVC.cursorPosition
        rootVC.cursorView = cursor
        
        window.rootViewController = rootVC
        window.makeKeyAndVisible()
    }
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didDisconnect interfaceController: CPInterfaceController, from window: CPWindow) {
        self.interfaceController = nil
        self.window = nil
    }
}
