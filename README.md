# ltn-parser

LTN即時新聞簡單爬蟲

## 簡介

如何使用 `LTNParser` class 請參考 `example.js`。  
另外 `lambda.js` 的 `handler` 是可以在 AWS Lambda 上面執行的 module。

## 功能

1. 到 LTN 下載即時新聞 (Page 1 only)
2. 將資料整理成 JSON
3. 寫入到 Firebase 的其中一個endpoint

## 設定

把 env.template 檔案複製到 .env，然後把Firebase相關設定換成你自己的即可。

註：本 script 為一個 AWS Lambda function。本機端執行的話必須自己做 wrapper 來 call。
