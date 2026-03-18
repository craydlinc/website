import fs from 'fs';
const a = JSON.parse(fs.readFileSync('./scripts/wp-page1.json', 'utf8'));
let withImg = 0;
for (const p of a) {
  if (/<img[^>]+src=/i.test(p.content.rendered)) withImg++;
}
console.log('posts with <img src in content:', withImg, '/', a.length);
