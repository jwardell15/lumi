import sys; sys.path.insert(0,'/workspace/diabetes-scanner/tools')
import chains as C, subprocess
L={'innout':'https://www.in-n-out.com/docs/default-source/downloads/nutrition_info.pdf',
'whata':'https://wbimageserver.whataburger.com/Nutrition.pdf',
'pizzaranch':'https://d257c1zjbj9yqq.cloudfront.net/general-uploads/PDFs/Pizza-Ranch-ANI-Sweet-Almond-Cactus-08.17.2023.pdf',
'godfathers':'https://godfathers.com/wp-content/uploads/2026/04/26-NT-Nutritionals-Web.pdf',
'smoothieking':'https://cdn.smoothieking.com/images/site/pdfs/Nutritionals-PDF_10_28_24.pdf',
'biggby':'https://biggby.com/wp-content/uploads/2026/02/BIGGBY_nutrition_February.26.26.pdf',
'scooters':'https://www.scooterscoffee.com/media/wysiwyg/nutrition-and-allergen-information.pdf'}
if __name__=='__main__':
  for k,u in L.items():
    try:
        p=C.fetch_pdf(u,k+'.pdf'); t=subprocess.run(['pdftotext','-layout',p,'-'],capture_output=True,text=True).stdout; open(f'{k}.txt','w').write(t); print(k,'OK',len(t))
    except Exception as e: print(k,'FAIL',str(e)[:150])
