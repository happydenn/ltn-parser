const LTNParser = require('./lib/LTNParser');

const parser = new LTNParser({
  articlesUrl: 'http://news.ltn.com.tw/list/BreakingNews',
});

parser.getArticles().then((articles) => {
  console.log(articles);
});
