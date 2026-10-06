# Roblox Classic Clothing

Ready-to-upload Roblox **classic Shirts and Pants**, all built on the official
**585 × 559** classic clothing template. Areas outside the template are transparent.

| File | Type | Upload as |
|---|---|---|
| `shirt_midnight_hoodie.png` | Navy hoodie: kangaroo pocket, drawstrings, star logo, gold sleeve stripes | Shirt |
| `pants_cargo_joggers.png` | Charcoal cargo joggers: belt, side cargo pockets, gathered cuffs | Pants |
| `shirt_varsity_jacket.png` | Red/cream varsity jacket: letter patch, snaps, striped ribbing, "26" back print | Shirt |
| `pants_light_jeans.png` | Light-wash jeans: brown belt, orange stitching, ripped knees | Pants |

Set 1 = hoodie + joggers, Set 2 = varsity jacket + jeans (they mix and match too).
`preview_*.png` and `template_guide.png` are for viewing only, so don't upload them.

## Verified against the official template
Checked pixel by pixel against Roblox's official `Template-Shirts-R15.png` /
`Template-Pants-R15.png`. All 18 panels match exactly, every panel pixel is fully
painted, and nothing is drawn outside the panels. See `preview_on_official_template.png`.

The dotted lines on the official template (torso y=170, arms/legs y=407) mark
where R15 avatars split into upper/lower torso and upper/lower limbs. Belts and
waistbands sit below the torso line. Cuffs and hems sit at the very bottom of the limbs.

## Template layout (x, y, w, h)

| Region | Front | Back | Left | Right | Up | Down |
|---|---|---|---|---|---|---|
| Torso | 231,74,128,128 | 427,74,128,128 | 361,74,64,128 | 165,74,64,128 | 231,8,128,64 | 231,204,128,64 |
| Right arm / leg | 217,355,64,128 | 85,355,64,128 | 19,355,64,128 | 151,355,64,128 | 217,289,64,64 | 217,485,64,64 |
| Left arm / leg | 308,355,64,128 | 440,355,64,128 | 374,355,64,128 | 506,355,64,128 | 308,289,64,64 | 308,485,64,64 |

## Uploading
1. Go to **create.roblox.com → Creations → Avatar Items** (or the Avatar
   Shop "Create" flow) and choose **Classic Shirt** or **Classic Pants**.
2. Upload the PNG and give it a name. Uploading clothing has a Robux fee and requires the item to pass moderation.
3. Classic clothing works on **R6 and R15 blocky** avatars.

## Regenerating / tweaking
```
pip install pillow
python3 make_clothing.py
```
Colours and details live in the `midnight_hoodie`, `cargo_joggers`,
`varsity_jacket` and `light_jeans` functions.
