import pandas as pd
import json
import re
import glob
import os

# تابع برای استخراج مقدار p/m از ستون نسبت پول به قیمت
def extract_pm(text):
    match = re.search(r'نسبت p/m=([\d.-]+)', str(text))
    return float(match.group(1)) if match else 0.0

# تابع برای استخراج مین حجم ماه
def extract_monthly_volume(text):
    match = re.search(r'مین حجم ماه=([\d.]+)', str(text))
    return float(match.group(1)) if match else 0.0

# تابع برای استخراج نسبت خرید
def extract_buy_ratio(text):
    match = re.search(r'خرید=([\d.]+)', str(text))
    return float(match.group(1)) if match else 0.0

# تابع برای استخراج نسبت فروش
def extract_sell_ratio(text):
    match = re.search(r'فروش =([\d.]+)', str(text))
    return float(match.group(1)) if match else 0.0

# پیدا کردن همه فایل‌های CSV توی پوشه
csv_files = glob.glob('*.csv')
print(f"تعداد فایل‌های CSV پیدا شده: {len(csv_files)}")

# لیست برای ذخیره همه داده‌ها
data = []

# پردازش هر فایل CSV
for file in csv_files:
    print(f"در حال پردازش: {file}")
    try:
        df = pd.read_csv(file, encoding='utf-8')
        
        for index, row in df.iterrows():
            symbol_data = {
                'symbol': row['نماد'],
                'pm_ratio': extract_pm(row['نسبت پول به قیمت']),
                'diff_3month': row['درصد اختلاف سه ماهه'],
                'risk': row['ریسک'],
                'volume_7days': row['میانگین حجم 7 روزه'],
                'monthly_volume': extract_monthly_volume(row['میانگین حجم / ارزش ماه']),
                'buy_ratio': extract_buy_ratio(row['نسبت خرید و فروش']),
                'sell_ratio': extract_sell_ratio(row['نسبت خرید و فروش']),
                'source_file': file  # اضافه کردن نام فایل مبدأ
            }
            data.append(symbol_data)
    except Exception as e:
        print(f"خطا در پردازش فایل {file}: {e}")

# ذخیره داده‌ها به‌صورت JSON
with open('processed_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n✅ همه {len(data)} نماد از {len(csv_files)} فایل با موفقیت به JSON تبدیل شدند!")
