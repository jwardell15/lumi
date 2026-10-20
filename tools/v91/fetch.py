import sys; sys.path.insert(0,'/workspace/diabetes-scanner/tools')
import chains as C, subprocess
L={'bww':'https://assets.ctfassets.net/6dxmiqksdkqb/2XgznB5cOqQ9l1r7PQAasB/dd312340082cc00107545e7ab21318a7/BWW_Nutrition_Guide__08-18-2026_-_11-17-2026_.pdf',
'tcf':'https://www.thecheesecakefactory.com/media/631/download?inline=',
'waffle':'https://www.wafflehouse.com/wp-content/uploads/2026/08/Nutritionals-Allergens-2026-08-27.pdf',
'portillos':'https://www.portillos.com/assets/1/6/Nutrition_and_Allergen_Information_9.29.26.pdf',
'dutch':'https://files.dutchbros.com/website/menu/nutritional-guide.pdf',
'tacojohns':'https://tacojohns.com/wp-content/uploads/2026/09/TAC-26-P5_NUTRITION-GUIDE_ED_V3.pdf',
'cheddars':'https://media.cheddars.com/images/site/pdf/Cheddars_Nutrition_Guide.pdf',
'pollo':'https://ptstorageblob.blob.core.windows.net/olo/Public%20Assets/Nutrionals%202024.pdf',
'schlotz':'https://www.schlotzskys.com/-/media/schlotzskys/pdfs/nutrition/sch1446044lsmnutritional-information1624.pdf?d=20250108T094153Z&v=1',
'cinnabon':'https://assets.ctfassets.net/zqt8tllj2cy0/4Bq0Y0devIE4thscn9K8mX/2771a74abccea02eed8011a9b5bcab35/Cinnabon-Nutritional-Guide-Domestic-10.2025.pdf'}
for k,u in L.items():
    try:
        p=C.fetch_pdf(u,k+'.pdf'); t=subprocess.run(['pdftotext','-layout',p,'-'],capture_output=True,text=True).stdout; open(f'{k}.txt','w').write(t); print(k,'OK',len(t))
    except Exception as e: print(k,'FAIL',str(e)[:150])
