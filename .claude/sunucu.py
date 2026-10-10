# Geliştirme sunucusu: proje kökünü (bu dosyanın bir üstü) önbelleksiz sunar ve vercel.json'daki
# genel güvenlik başlıklarını ("/(.*)") da gönderir; CSP yerelde de sınanır.
# Kullanım: python antratech/.claude/sunucu.py 4180
import http.server, functools, sys, os, json
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def genel_basliklar():
    # her istekte yeniden okunur: vercel.json'daki CSP değişince sunucuyu yeniden başlatmak gerekmez
    try:
        return [b for b in json.load(open(os.path.join(KOK, 'vercel.json'), encoding='utf-8'))['headers'] if b['source'] == '/(.*)'][0]['headers']
    except Exception:
        return []
import gzip, io
SIKISTIR = {'.html', '.css', '.mjs', '.js', '.json', '.svg', '.txt', '.xml'}

class OnbelleksizIsleyici(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        # yayındaki gibi metin dosyalarını sıkıştırarak gönder (Vercel brotli; burada gzip, oranı yakın)
        yol = self.translate_path(self.path)
        if os.path.isdir(yol):
            yol = os.path.join(yol, 'index.html')
        uz = os.path.splitext(yol)[1].lower()
        if uz in SIKISTIR and os.path.isfile(yol) and 'gzip' in self.headers.get('Accept-Encoding', ''):
            veri = gzip.compress(open(yol, 'rb').read(), 6)
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(yol))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(veri)))
            self.end_headers()
            return io.BytesIO(veri)
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        for b in genel_basliklar():
            self.send_header(b['key'], b['value'])
        super().end_headers()
    def log_message(self, *a):
        pass
    def send_error(self, code, message=None, explain=None):
        # Vercel gibi: bulunamayan yolda 404.html
        yol = os.path.join(KOK, '404.html')
        if code == 404 and os.path.exists(yol):
            govde = open(yol, 'rb').read()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(govde)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(govde)
            return
        super().send_error(code, message, explain)
OnbelleksizIsleyici.extensions_map.update({'.mjs': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml'})
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4180
class Sunucu(http.server.ThreadingHTTPServer):
    request_queue_size = 128      # varsayılan 5: hızlı ardışık sayfa yüklemelerinde bağlantılar reddediliyordu
    daemon_threads = True
Sunucu(('127.0.0.1', port), functools.partial(OnbelleksizIsleyici, directory=KOK)).serve_forever()
