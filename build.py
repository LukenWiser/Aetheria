import glob, subprocess, sys, os
S = os.path.dirname(os.path.abspath(__file__)) + '/src/'
out = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
head = open(S + '01_head.html').read()
body = open(S + '02_body.html').read()
js = ''.join(open(f).read() + '\n' for f in sorted(glob.glob(S + '[1-9]*.js')))
js = "(function(){'use strict';\n" + js + "\n})();\n"
tmp = os.path.dirname(os.path.abspath(__file__)) + '/v4_check.js'
open(tmp, 'w').write(js)
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
if r.returncode:
    print(r.stderr[:2500]); sys.exit(1)
html = head + body + '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\n' + js + '</script>\n</body></html>\n'
open(out, 'w').write(html)
print('OK', len(html), 'bytes', js.count('\n'), 'js lines ->', out)
