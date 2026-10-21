import sys; sys.path.insert(0,'/workspace/diabetes-scanner/tools')
import chains as C, subprocess
L={'donatos':'https://files.donatos.com/2026/07/22/Master-Nutrition-File-for-Update-Mariachi-07.21.2026.pdf',
'jollibee':'https://jollibee-prod-media.s3.us-west-2.amazonaws.com/20260701_JB_USA_Nutrition_Facts_2026_Mktg_8f037d9d5d.pdf',
'larosas':'https://www.larosas.com/pdf/LaRosas_Nutrition_August_2026.pdf?v=08-26',
'goldstar':'https://www.goldstarchili.com/pdf/nutrition.pdf',
'cookout':'https://cookout.com/wp-content/uploads/Cook-Out-Nutrition1.pdf',
'huddle':'https://a.storyblok.com/f/140760/x/751008c3a2/155754_nutritional_june24.pdf',
'quiktrip':'https://www.quiktrip.com/app/uploads/2025/04/NUTRITIONAL-TABLE6.pdf',
'circlek':'https://www.circlek.com/media-assets/uploads/2026-05/Food%20Nutritional%205.15.26.pdf'}
if __name__=='__main__':
  for k,u in L.items():
    try:
        p=C.fetch_pdf(u,k+'.pdf'); t=subprocess.run(['pdftotext','-layout',p,'-'],capture_output=True,text=True).stdout; open(f'{k}.txt','w').write(t); print(k,'OK',len(t))
    except Exception as e: print(k,'FAIL',str(e)[:150])
