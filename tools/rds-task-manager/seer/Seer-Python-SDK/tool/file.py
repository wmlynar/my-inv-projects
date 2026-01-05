import sys
import json

file_name = sys.argv[1]
output_name = sys.argv[2]

with open(file_name, 'r') as input_file:
    lines = input_file.readlines()
    with open(output_name, 'w') as output_file:
        for line in lines:
            lines_ = line.split(" ")
            time = lines_[0]
            localtion = json.loads(lines_[1])
            x =  localtion['x']
            y =  localtion['y']
            angle = localtion['angle']
            velocity = json.loads(lines_[2])
            vx = velocity['vx']
            vy = velocity['vy']
            w = velocity['w']
            r_vx = velocity['r_vx']
            r_vy = velocity['r_vy']
            r_w = velocity['r_w']
            output_file.write("%s %s %s %s %s %s %s %s %s %s\n" %(time, x, y, angle, vx, vy, w, r_vx, r_vy, r_w))
