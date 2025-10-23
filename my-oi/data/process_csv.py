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

# پردازش هر فایل CSV
for file in csv_files:
    print(f"در حال پردازش: {file}")
    try:
        # استخراج تاریخ از نام فایل (مثل 4040730 → 14040730)
        date = file.split('.')[0]
        if len(date) == 7:
            date = f"14{date}"
        
        # خواندن فایل CSV
        df = pd.read_csv(file, encoding='utf-8')
        
        # لیست برای داده‌های این فایل
        data = []
        
        for index, row in df.iterrows():
            # بررسی اینکه آیا نماد قبلاً اضافه شده یا نه
            symbol_exists = any(d['symbol'] == row['نماد'] for d in data)
            if not symbol_exists:
                symbol_data = {
                    'symbol': row['نماد'],
                    'pm_ratio': extract_pm(row['نسبت پول به قیمت'] if 'نسبت پول به قیمت' in df.columns else ''),
                    'diff_3month': row['درصد اختلاف سه ماهه'] if 'درصد اختلاف سه ماهه' in df.columns else 0.0,
                    'risk': row['ریسک'] if 'ریسک' in df.columns else 0.0,
                    'volume_7days': row['میانگین حجم 7 روزه'] if 'میانگین حجم 7 روزه' in df.columns else 0.0,
                    'monthly_volume': extract_monthly_volume(row['میانگین حجم / ارزش ماه'] if 'میانگین حجم / ارزش ماه' in df.columns else ''),
                    'buy_ratio': extract_buy_ratio(row['نسبت خرید و فروش']),
                    'sell_ratio': extract_sell_ratio(row['نسبت خرید و فروش']),
                    'source_file': file,
                    'date': date  # اضافه کردن تاریخ به داده‌ها
                }
                data.append(symbol_data)
        
        # ذخیره داده‌های این فایل در JSON جداگانه
        output_file = f'processed_data_{date}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ {len(data)} نماد از فایل {file} به {output_file} تبدیل شد!")
    
    except Exception as e:
        print(f"خطا در پردازش فایل {file}: {e}")

print("\n✅ پردازش همه فایل‌ها تمام شد!")
