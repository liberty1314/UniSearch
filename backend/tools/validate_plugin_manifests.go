package main

import (
	"fmt"
	"os"
	"strings"

	"unisearch/plugin"

	_ "unisearch/plugin/aikanzy"
	_ "unisearch/plugin/alupan"
	_ "unisearch/plugin/ash"
	_ "unisearch/plugin/cldi"
	_ "unisearch/plugin/clmao"
	_ "unisearch/plugin/daishudj"
	_ "unisearch/plugin/djgou"
	_ "unisearch/plugin/dyyj"
	_ "unisearch/plugin/erxiao"
	_ "unisearch/plugin/feikuai"
	_ "unisearch/plugin/fox4k"
	_ "unisearch/plugin/hunhepan"
	_ "unisearch/plugin/javdb"
	_ "unisearch/plugin/jsnoteclub"
	_ "unisearch/plugin/jutoushe"
	_ "unisearch/plugin/kkmao"
	_ "unisearch/plugin/kkv"
	_ "unisearch/plugin/labi"
	_ "unisearch/plugin/libvio"
	_ "unisearch/plugin/lou1"
	_ "unisearch/plugin/meitizy"
	_ "unisearch/plugin/mikuclub"
	_ "unisearch/plugin/mizixing"
	_ "unisearch/plugin/muou"
	_ "unisearch/plugin/nyaa"
	_ "unisearch/plugin/ouge"
	_ "unisearch/plugin/pansearch"
	_ "unisearch/plugin/panta"
	_ "unisearch/plugin/qingying"
	_ "unisearch/plugin/quark4k"
	_ "unisearch/plugin/quarksoo"
	_ "unisearch/plugin/shandian"
	_ "unisearch/plugin/susu"
	_ "unisearch/plugin/thepiratebay"
	_ "unisearch/plugin/u3c3"
	_ "unisearch/plugin/wanou"
	_ "unisearch/plugin/weibo"
	_ "unisearch/plugin/xinjuc"
	_ "unisearch/plugin/xuexizhinan"
	_ "unisearch/plugin/yiove"
	_ "unisearch/plugin/ypfxw"
	_ "unisearch/plugin/yuhuage"
	_ "unisearch/plugin/zxzj"
)

func main() {
	plugins := plugin.GetRegisteredPlugins()
	if len(plugins) == 0 {
		fmt.Println("插件清单校验失败：未发现已注册插件")
		os.Exit(1)
	}

	ids := make(map[string]string, len(plugins))
	problems := make([]string, 0)
	generated := make([]string, 0)

	for _, candidate := range plugins {
		manifest := plugin.ResolvePluginManifest(candidate)
		if strings.TrimSpace(manifest.ID) == "" {
			problems = append(problems, fmt.Sprintf("%s: 缺少 id", candidate.Name()))
		}
		if strings.TrimSpace(manifest.Version) == "" {
			problems = append(problems, fmt.Sprintf("%s: 缺少 version", candidate.Name()))
		}
		if strings.TrimSpace(manifest.Category) == "" {
			problems = append(problems, fmt.Sprintf("%s: 缺少 category", candidate.Name()))
		}
		if len(manifest.Capabilities) == 0 {
			problems = append(problems, fmt.Sprintf("%s: 缺少 capabilities", candidate.Name()))
		}
		if strings.TrimSpace(manifest.Resource.SourceLabel) == "" {
			problems = append(problems, fmt.Sprintf("%s: 缺少 resource.source_label", candidate.Name()))
		}
		if owner, exists := ids[manifest.ID]; exists {
			problems = append(problems, fmt.Sprintf("%s: id 与 %s 重复：%s", candidate.Name(), owner, manifest.ID))
		}
		ids[manifest.ID] = candidate.Name()

		if manifest.ManifestStatus == "generated" {
			generated = append(generated, candidate.Name())
		}
	}

	if len(problems) > 0 {
		fmt.Println("插件清单校验失败：")
		for _, problem := range problems {
			fmt.Printf("- %s\n", problem)
		}
		os.Exit(1)
	}

	fmt.Printf("插件清单校验通过：共 %d 个插件。\n", len(plugins))
	if len(generated) > 0 {
		fmt.Printf("仍使用生成清单的插件数量：%d。后续迁移时应逐个补齐显式 manifest。\n", len(generated))
	}
}
