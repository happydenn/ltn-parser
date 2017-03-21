'use strict';

const LTNParser = require('./lib/LTNParser');

exports.handler = function(event, context, callback) {
  const parser = new LTNParser({
    articlesUrl: 'http://news.ltn.com.tw/list/BreakingNews',
  });

  parser.getArticles().then((articles) => {
    callback(null, articles);
  });
};
