package main

import (
	"log"

	"unisearch/api"
	"unisearch/cmd/bootstrap"

	// 以下是插件的空导入，用于触发各插件的init函数，实现自动注册
	// 添加新插件时，只需在此处添加对应的导入语句即可
	_ "unisearch/plugin/aikanzy"
	_ "unisearch/plugin/alupan"
	_ "unisearch/plugin/clmao"
	_ "unisearch/plugin/daishudj"
	_ "unisearch/plugin/dyyj"
	_ "unisearch/plugin/feikuai"
	_ "unisearch/plugin/huban"
	_ "unisearch/plugin/hunhepan"
	_ "unisearch/plugin/jsnoteclub"
	_ "unisearch/plugin/jutoushe"
	_ "unisearch/plugin/kkmao"
	_ "unisearch/plugin/kkv"
	_ "unisearch/plugin/labi"
	_ "unisearch/plugin/lou1"
	_ "unisearch/plugin/meitizy"
	_ "unisearch/plugin/mikuclub"
	_ "unisearch/plugin/mizixing"
	_ "unisearch/plugin/muou"
	_ "unisearch/plugin/nyaa"
	_ "unisearch/plugin/ouge"
	_ "unisearch/plugin/pansearch"
	_ "unisearch/plugin/panta"
	_ "unisearch/plugin/panwiki"
	_ "unisearch/plugin/panyq"
	_ "unisearch/plugin/qingying"
	_ "unisearch/plugin/quark4k"
	_ "unisearch/plugin/quarksoo"
	_ "unisearch/plugin/shandian"
	_ "unisearch/plugin/sidhub"
	_ "unisearch/plugin/susu"
	_ "unisearch/plugin/thepiratebay"
	_ "unisearch/plugin/u3c3"
	_ "unisearch/plugin/wanou"
	_ "unisearch/plugin/weibo"
	_ "unisearch/plugin/xinjuc"
	_ "unisearch/plugin/yiove"
	_ "unisearch/plugin/ypfxw"
	_ "unisearch/plugin/zxzj"
)

func main() {
	app, err := bootstrap.Initialize()
	if err != nil {
		log.Fatalf("应用初始化失败: %v", err)
	}

	router := api.SetupRouter(app.RouterDeps)
	server := bootstrap.NewHTTPServer(router)
	if err := bootstrap.Run(server, app); err != nil {
		log.Fatalf("应用运行失败: %v", err)
	}
}
