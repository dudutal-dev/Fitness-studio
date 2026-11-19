#!/bin/bash
# מוזיקת הרקע לשיעורים (assets/music): שש רצועות מקוריות, 3.5 דקות כל אחת, שנוצרו ב-ElevenLabs Music.
# שימוש: tools/gen_music.sh [שם ...]   (בלי שמות — כל הרצועות). עד שתי בקשות במקביל (מגבלת החשבון).
# אחרי היצירה: איזון עוצמה ל- ‎-18 LUFS, כניסה ויציאה בדעיכה, וקידוד ל-MP3 128k.
set -e
cd "$(dirname "$0")/.."
mkdir -p assets/_src/music assets/music
declare -A P
P[yoga_1]="Instrumental only, no vocals. A beautiful, slow, deeply calming piece for a yoga class at sunrise. Warm analog synth pads that swell gently, sparse felt piano notes with long reverb, a soft bansuri flute melody that appears and fades, a low tanpura-like drone, occasional singing bowl. 60 bpm feel, no drums or percussion. Spacious, meditative, hopeful, high-end studio production, wide stereo. Starts softly and ends by fading out."
P[yoga_2]="Instrumental only, no vocals. Serene ambient music for slow yoga and breathing. Gentle handpan patterns, soft sustained strings, airy evolving pads, a distant warm piano. Very slow and unhurried, around 62 bpm, no drum kit. Feels like still water in early morning light: peaceful, grounded, tender. Rich, polished, cinematic production with a wide soundstage. Soft intro and a long gentle fade out."
P[pil_1]="Instrumental only, no vocals. Elegant mellow downtempo for a Pilates mat class. Warm Rhodes electric piano chords, delicate nylon-string guitar plucks, a soft round bass, light brushed percussion and gentle shaker, airy pads. Steady 84 bpm, calm but quietly uplifting, focused and graceful. Boutique studio atmosphere, refined modern production. Soft intro, ends with a gentle fade out."
P[pil_2]="Instrumental only, no vocals. Organic chillout for a Pilates class in a bright studio. Kalimba and marimba patterns interlocking softly, acoustic guitar harmonics, warm sub bass, subtle hand percussion, shimmering pads. Around 90 bpm, light, flowing, optimistic and precise, never busy. High-quality, detailed, spacious mix. Gentle start and a smooth fade out at the end."
P[mob_1]="Instrumental only, no vocals. Warm lo-fi chill for a stretching and mobility session. Soft tape-saturated electric piano, mellow guitar licks, gentle vinyl texture, deep soft bass, a slow relaxed laid-back beat at 70 bpm with soft kick and rimshot. Cozy, unhurried, comforting, evening mood. Tasteful, polished production. Soft intro and fade out ending."
P[mob_2]="Instrumental only, no vocals. Slow cinematic ambient for deep stretching and release. A tender cello melody over soft piano, slowly evolving warm pads, subtle harp-like plucks, no drums. About 56 bpm, spacious and emotional but calm, like a long exhale. Lush, high-end orchestral-ambient production with wide stereo. Begins quietly and ends in a long fade out."
LEN=210000
names=("$@"); [ ${#names[@]} -eq 0 ] && names=(yoga_1 yoga_2 pil_1 pil_2 mob_1 mob_2)
one() {
  local n=$1 raw=assets/_src/music/$1.mp3
  curl -sS --fail -X POST "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192" -H "xi-api-key: ${ELEVENLABS_API_KEY:-dummy}" -H "Content-Type: application/json" \
    --data "$(python3 -c 'import json,sys; print(json.dumps({"prompt": sys.argv[1], "music_length_ms": int(sys.argv[2]), "model_id": "music_v1", "force_instrumental": True}))' "${P[$n]}" "$LEN")" -o "$raw"
  local d; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$raw")
  local fo; fo=$(python3 -c "print(max(0, float('$d') - 6))")
  ffmpeg -hide_banner -loglevel error -y -i "$raw" -af "loudnorm=I=-18:TP=-2:LRA=11,afade=t=in:d=2.5,afade=t=out:st=$fo:d=6" -ar 44100 -ac 2 -c:a libmp3lame -b:a 128k "assets/music/$n.mp3"
  echo "$n ✓"
}
i=0
for n in "${names[@]}"; do one "$n" & i=$((i + 1)); [ $((i % 2)) -eq 0 ] && wait; done
wait
