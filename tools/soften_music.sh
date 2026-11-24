#!/bin/bash
# עידון רצועות המדיטציה בהליכה (25.11.2026): בעל המוצר שמע "רעשים" בחלק מהרצועות. מהמקור שב-assets/_src/music נוצרת גרסה רכה יותר:
# חיתוך הבס העמוק (מתחת ל-55 הרץ — רועד ברמקול של טלפון ובאוזניות קטנות), הנמכה של הצלילים הגבוהים והחדים (מדף של ‎-5 dB מעל 6.5 קילוהרץ, וחיתוך מעל 13),
# ואז איזון עוצמה ודעיכות כמו ב-gen_music.sh. שימוש: tools/soften_music.sh <מקור> <שם חדש> [...]   למשל: tools/soften_music.sh medcalm_7 medcalm_11
set -e
cd "$(dirname "$0")/.."
# SLEEP=1 — לרצועות הלילה: גם בלי בס מתחת ל-70 הרץ, ועם ריכוך של צלילים שקופצים פתאום בעוצמה (מדחס עדין ותקרה של ‎-6 dB), כדי שתו בודד לא יעיר
PRE="highpass=f=55,bass=g=-2:f=90,treble=g=-5:f=6500,lowpass=f=13000,loudnorm=I=-18:TP=-2:LRA=11"
[ -n "$SLEEP" ] && PRE="highpass=f=70,bass=g=-3:f=100,treble=g=-5:f=6500,lowpass=f=12000,acompressor=threshold=-26dB:ratio=3:attack=40:release=900:makeup=1,loudnorm=I=-20:TP=-6:LRA=7"
while [ $# -ge 2 ]; do
  raw=assets/_src/music/$1.mp3; out=assets/music/$2.mp3
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$raw"); fo=$(python3 -c "print(max(0, float('$d') - 6))")
  ffmpeg -hide_banner -loglevel error -y -i "$raw" -af "$PRE,afade=t=in:d=2.5,afade=t=out:st=$fo:d=6" -ar 44100 -ac 2 -c:a libmp3lame -b:a 128k "$out"
  echo "$1 → $2 ✓"; shift 2
done
