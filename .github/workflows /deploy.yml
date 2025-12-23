name: Deploy Static Website to Pages

on:
  # Action จะรันเมื่อมีการ Push โค้ดไปยัง branch 'main' เท่านั้น
  push:
    branches: ["main"] 
  
  # อนุญาตให้รันด้วยตนเองได้ผ่านหน้า GitHub Actions
  workflow_dispatch:

# กำหนดสิทธิ์ที่จำเป็นในการ Deploy ไปยัง Pages
permissions:
  contents: read
  pages: write 
  id-token: write 

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        # ใช้สำหรับอัปโหลดโค้ดเว็บไซต์ (ที่อยู่ Root Directory)
        uses: actions/upload-pages-artifact@v3
        with:
          path: './' # อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์ปัจจุบัน (Root)

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
