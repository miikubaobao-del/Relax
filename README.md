# Never Mind — Visible Chicken + Corn Fix

Run using a local web server:

```bash
python3 -m http.server 8000
```

Then open:

http://localhost:8000

Changes in this version:
- The chicken is now rendered as a normal DOM image, so it reliably appears in the browser.
- Chicken size is intentionally slightly smaller than the background animals.
- Chicken still moves through the same 3D X/Z ground space.
- Its on-screen size changes slightly with Z depth.
- Multiple chickens collide and push each other apart.
- Eating uses a repeated pecking/head-dip motion.
- Typed text no longer spins.
- It first collapses straight into a small clump, then drops directly onto the grass and becomes a corn kernel.
