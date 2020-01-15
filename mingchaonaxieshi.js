const request = require("request");
const cherrio = require("cheerio");
const write = require("write");
var promise = require('bluebird');
const baseUrl = 'http://www.mingchaonaxieshier.com/';

let finished = 0
let count = 0

function start() {
console.log(`正在访问${baseUrl},请等待...`);
request({
  url: baseUrl,
  timeout: 5000
}, (error, resp, body) => {

  if (error) {
    console.error('访问失败，Error' + error)
    start()
    return
  }
  
  console.info(`${baseUrl}已载入`)
  const $ = cherrio.load(body);

  const parts = $('.main');

  let allSiteLinks = [];

  // 遍历每一部书
  let _index = 0
  parts.find('.bg').each((partIndex, cap) => {
    console.log(`正在遍历第${partIndex + 1}部明朝那些事儿...`)
    $(cap).find('tr').each((trIndex, tr) => {
      $(tr).find('td').each((tdIndex, td) => {
        if ($(td).attr('colspan') === undefined) {
          const _link = $(td).find('a').attr('href');
          if (_link) {
            _index++
            allSiteLinks.push({
              partIndex,
              capIndex: _index,
              link: _link
            })
          }
        }
      })
    })
    console.info(`第${partIndex + 1}部明朝那些事儿遍历完成`)
  })
  console.info(`所有的小说章节地址数据已生成。数据总数：${allSiteLinks.length}`)

  count = allSiteLinks.length
  const task = allSiteLinks.map((link, index) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reqCapContent(link).then(() => {
          resolve()
        }).catch(() => {
          reject()
        })
      }, index * 1500);
    })
  })

  promise.all(task).then(res => {
    console.info('下载完毕。')
  })
})

function reqCapContent(linkObj) {
  return new Promise((resolve, reject) => {
    const { partIndex,capIndex, link } = linkObj;

    console.log(`正在访问${link},请等待...`)
    request({
      url: link,
      timeout: 5000
    }, (error, resp, body) => {
    if (error) {
      console.error('访问失败，Error' + error + `重试：${link}`)
      reqCapContent(linkObj)
      return
    }
    console.log(`访问成功`);
    const $ = cherrio.load(body);

    const $main = $('.main');

    // 章节标题
    const capTitle = $main.find('h1').text() + '【明朝那些事儿】';

    let $contentList = $('.main .content>p');

    let mdContent = `---

title: ${capTitle}
author: xiangzhipeng918@gmail.com
tags: [历史,明朝那些事儿]
categories: 明朝那些事儿-第${partIndex + 1}部
featured_image: https://file.veryzhun.com/buckets/adsb-dm/keys/20200115-052154-xuggt9dny09gmm26.jpg
date: ${new Date('2016/01/01').getTime() + capIndex * 86400000}

---

    `;

    if ($contentList.length > 0) {
      $contentList.each((index, p) => {
        if ($(p).find('a').length <= 0) {
          let content = $(p).text()
          if (content.startsWith('【') && content.endsWith('】')) {
            content = content.replace(/【|】/g, '');
            mdContent += `

### ${content}

            `;
          } else {
            mdContent += `
${content}
            `;
          }
        }
      })
    }

    mdContent += `
> 数据来源于：[http://www.mingchaonaxieshier.com/](http://www.mingchaonaxieshier.com/)如有侵权，请联系我删除。爬虫程序：[https://github.com/xiangzp/mingchaonaxieshier-md](https://github.com/xiangzp/mingchaonaxieshier-md) 欢迎 star`

    console.log(`正在写入文件：${capTitle}.md...`);
    write.sync(`./dist/${capTitle}.md`, mdContent, { overwrite: true }); 
    finished++
    console.info(`${capTitle}.md 已经创建成功。已完成${finished}/${count}`);
    resolve()
  })
  })
}
}

start()