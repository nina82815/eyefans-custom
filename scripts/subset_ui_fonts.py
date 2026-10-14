"""Build WOFF2 UI subsets; full customer-name fonts remain available separately."""
from pathlib import Path
from fontTools import subset
import base64, io, json, re
root=Path(__file__).resolve().parents[1]
source=(root/'index.html').read_text()+(root/'app.js').read_text()
# Include all labels in the page/app, ASCII, and common Chinese punctuation.
chars=set(re.findall(r'[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]',source))|set(chr(n) for n in range(32,127))
fonts=[('GenSenRounded2TW-R.otf','eYeFans GenSen Rounded',400),('GenSenRounded2TW-B.otf','eYeFans GenSen Rounded',700),('tsuhsianti-proportional.ttf','eYeFans Tsuhsian',700),('jf-jinxuanlatte-3.0-extrabold.otf','eYeFans JinXuan Latte',800)]
faces=[]
for file,family,weight in fonts:
 options=subset.Options(); options.flavor='woff2'
 font=subset.load_font(str(root/'assets/fonts'/file),options)
 cutter=subset.Subsetter(options=options); cutter.populate(text=''.join(sorted(chars))); cutter.subset(font)
 out=io.BytesIO();font.flavor='woff2';font.save(out)
 data=base64.b64encode(out.getvalue()).decode()
 faces.append(f'@font-face{{font-family:"{family} UI";font-weight:{weight};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,{data}) format("woff2");}}')
 print(file,len(out.getvalue()))
(root/'assets/ui-fonts.css').write_text('\n'.join(faces))
