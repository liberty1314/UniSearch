import os

abnormal_channels = {
    'yggpan', 'qixingzhenren', 'tyysypzypd', 'kaipanshare', 'sbsbsnsqq',
    'tgsearchers6', 'kkxlzy', 'cctv1211', 'alyp_1', 'wfysfx02',
    'dianyingshare', 'liangxingzhinan', 'ammmziyuan', 'jzmm_123pan',
    'cili8888', 'peccxin', 'movie888035', 'zyywpzy', 'xlwpzy', 'wydwpzy'
}
# convert to lower to handle case-insensitivity just in case, but let's do exact match first as per string above
# Wait, 'KaiPanshare' vs 'kaipanshare', 'WFYSFX02' vs 'wfysfx02', 'Movie888035' vs 'movie888035'
abnormal_channels_lower = {c.lower() for c in abnormal_channels}

files_to_update = [
    "/Users/abner/Desktop/MyProject/UniSearch_dev/.env",
    "/Users/abner/Desktop/MyProject/UniSearch_dev/.env.example"
]

for file_path in files_to_update:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if line.startswith("CHANNELS="):
            channels_str = line.strip().split('=', 1)[1]
            channels_list = channels_str.split(',')
            new_channels = [c for c in channels_list if c.lower() not in abnormal_channels_lower]
            lines[i] = "CHANNELS=" + ",".join(new_channels) + "\n"
            print(f"Updated {file_path}, removed {len(channels_list) - len(new_channels)} channels.")
            break
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
