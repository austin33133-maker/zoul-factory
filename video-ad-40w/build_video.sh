#!/bin/bash
# Build the final 30-second 9:16 MP4 from the 6 keyframes.
# Fast version: static frames + xfade transitions + synthesized BGM.
set -e
cd "$(dirname "$0")"

FRAMES="frames"
TMP="tmp_clips"
rm -rf "$TMP"
mkdir -p "$TMP"

# Scene durations: 3+6+6+6+6+3 = 30s
make_clip() {
  local in=$1 dur=$2 out=$3
  ffmpeg -y -loglevel error -loop 1 -framerate 30 -t "$dur" -i "$in" \
    -vf "scale=1080:1920,format=yuv420p" \
    -c:v libx264 -preset ultrafast -tune stillimage -crf 20 -r 30 "$out"
}

echo "→ [1/3] Rendering scene clips..."
# Each scene is 0.4s longer than nominal to compensate for the xfade overlap.
# Raw: 3.4 + 6.4*4 + 3.4 = 32s ; minus 5 fades × 0.4s = 30s exact.
make_clip "$FRAMES/scene1.png" 3.4 "$TMP/s1.mp4"
make_clip "$FRAMES/scene2.png" 6.4 "$TMP/s2.mp4"
make_clip "$FRAMES/scene3.png" 6.4 "$TMP/s3.mp4"
make_clip "$FRAMES/scene4.png" 6.4 "$TMP/s4.mp4"
make_clip "$FRAMES/scene5.png" 6.4 "$TMP/s5.mp4"
make_clip "$FRAMES/scene6.png" 3.4 "$TMP/s6.mp4"

echo "→ [2/3] Concatenating with xfade transitions..."
ffmpeg -y -loglevel error \
  -i "$TMP/s1.mp4" -i "$TMP/s2.mp4" -i "$TMP/s3.mp4" \
  -i "$TMP/s4.mp4" -i "$TMP/s5.mp4" -i "$TMP/s6.mp4" \
  -filter_complex "\
    [0:v][1:v]xfade=transition=fadewhite:duration=0.4:offset=3.0[v01]; \
    [v01][2:v]xfade=transition=slideleft:duration=0.4:offset=9.0[v012]; \
    [v012][3:v]xfade=transition=fade:duration=0.4:offset=15.0[v0123]; \
    [v0123][4:v]xfade=transition=slideright:duration=0.4:offset=21.0[v01234]; \
    [v01234][5:v]xfade=transition=fadeblack:duration=0.4:offset=27.0[vout]" \
  -map "[vout]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -r 30 \
  video_silent.mp4

echo "→ [3/3] Synthesizing ambient BGM + muxing..."
ffmpeg -y -loglevel error \
  -f lavfi -t 30 -i "sine=frequency=220:sample_rate=44100" \
  -f lavfi -t 30 -i "sine=frequency=330:sample_rate=44100" \
  -f lavfi -t 30 -i "sine=frequency=440:sample_rate=44100" \
  -filter_complex "\
    [0:a]volume=0.10,tremolo=f=0.5:d=0.4[a1]; \
    [1:a]volume=0.07,tremolo=f=0.7:d=0.3[a2]; \
    [2:a]volume=0.05,tremolo=f=0.3:d=0.5[a3]; \
    [a1][a2]amix=inputs=2:duration=longest[m1]; \
    [m1][a3]amix=inputs=2:duration=longest,aresample=44100,afade=t=in:st=0:d=1,afade=t=out:st=29:d=1[aout]" \
  -map "[aout]" -c:a aac -b:a 128k bgm.aac

ffmpeg -y -loglevel error -i video_silent.mp4 -i bgm.aac \
  -c:v copy -c:a aac -b:a 128k -shortest 40w_charger_ad_30s.mp4

rm -rf "$TMP" video_silent.mp4 bgm.aac

echo ""
echo "✅ Done!"
ls -lh 40w_charger_ad_30s.mp4
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 40w_charger_ad_30s.mp4 | xargs -I{} echo "Duration: {}s"
