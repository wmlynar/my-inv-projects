import time
import datetime
import json

from seer_sdk.connector import Connector
from seer_sdk.apis import STATUS

conn = Connector("10.20.204.144", 19204)
conn.connect()

while True:
    localtion_data = conn.send(1004)
    velocity_data = conn.send(1005)
    x_time = datetime.datetime.now().strftime("%H:%M:%S:%f")[:-4]
    localtion_json = json.dumps(localtion_data[1].data).replace(' ', '')
    velocity_json = json.dumps(velocity_data[1].data).replace(' ', '')
    print("%s %s %s" %(x_time, localtion_json, velocity_json))
    time.sleep(0.1)