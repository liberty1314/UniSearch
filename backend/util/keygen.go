package util

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

// GenerateAPIKey 生成一个安全的 API Key
// 格式: "sk-" + 40 位十六进制字符串（共 42 字符）
//
// 返回:
//   - string: 生成的 API Key，格式为 "sk-" 开头的 42 字符字符串
//
// 实现细节:
//   - 使用 crypto/rand 生成 20 字节的安全随机数
//   - 将随机数编码为 40 位十六进制字符串
//   - 添加 "sk-" 前缀，总长度为 42 字符
//
// 验证需求: 7.4
func GenerateAPIKey() string {
	// 生成 20 字节的随机数据（20 字节 = 40 位十六进制字符）
	randomBytes := make([]byte, 20)

	// 使用 crypto/rand 生成安全的随机数
	_, err := rand.Read(randomBytes)
	if err != nil {
		// 如果随机数生成失败，使用备用方案（理论上不应该发生）
		// 这里我们 panic，因为无法生成安全的随机数是严重错误
		panic(fmt.Sprintf("无法生成安全随机数: %v", err))
	}

	// 将随机字节编码为十六进制字符串（40 个字符）
	hexString := hex.EncodeToString(randomBytes)

	// 添加 "sk-" 前缀，返回 42 字符的 API Key
	return "sk-" + hexString
}
