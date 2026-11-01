import os,socket,subprocess,sys,tempfile,time,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='mare-honors-') as temp:
 s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close()
 env=os.environ.copy();env.update(MARE_AKUMA_DB=str(Path(temp)/'qa.sqlite3'),PYTHONPATH=str(root/'server'))
 code="from app import Handler;from http.server import ThreadingHTTPServer;ThreadingHTTPServer(('127.0.0.1',"+str(port)+"),Handler).serve_forever()"
 command=[sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'] if '--offline' in sys.argv else [sys.executable,'-X','utf8','-c',code]
 server=subprocess.Popen(command,cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=0x08000000 if os.name=='nt' else 0)
 try:
  for _ in range(100):
   try:urllib.request.urlopen(f'http://127.0.0.1:{port}/',timeout=1);break
   except Exception:time.sleep(.1)
  env.update(MARE_TEST_URL=f'http://127.0.0.1:{port}/',MARE_QA_DIR=os.environ.get('MARE_QA_DIR',str(root/'tmp'/'honors-hd')))
  if '--dist' in sys.argv:env['MARE_TEST_URL']+='dist/'
  Path(env['MARE_QA_DIR']).mkdir(parents=True,exist_ok=True)
  if os.name=='nt':
   env.setdefault('NODE_PATH',str(Path(tempfile.gettempdir())/'mare-partida-playwright'/'node_modules'))
   chrome=Path(os.environ.get('ProgramFiles','C:/Program Files'))/'Google'/'Chrome'/'Application'/'chrome.exe'
   if chrome.is_file():env.setdefault('CHROME_PATH',str(chrome))
  result=subprocess.run(['node',sys.argv[1] if len(sys.argv)>1 else 'tests/honors_hd_browser.cjs'],cwd=root,env=env);sys.exit(result.returncode)
 finally:server.terminate();server.wait()
