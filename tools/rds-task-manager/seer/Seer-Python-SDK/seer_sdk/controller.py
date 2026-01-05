from seer_sdk.connector import Connector
from seer_sdk.apis import R_STATUS, R_CONTROL


class Direction:
    def __init__(self):
        pass

    @staticmethod
    def Forward():
        return "forward"

    @staticmethod
    def Backward():
        return "backward"

    @staticmethod
    def Left():
        return "left"

    @staticmethod
    def Right():
        return "right"


class Laser(object):
    def __init__(self, beams, device_info, header, install_info):
        self.beams = beams
        self.device_info = device_info
        self.header = header
        self.install_info = install_info


class Robot(object):
    def __init__(self, ip, control=False):
        self.message = ""
        self.conn = Connector(ip, 19204)
        self.x = 0
        self.y = 0
        self.angle = 0
        self.confidence = 0
        self.vx = 0
        self.vy = 0
        self.w = 0
        self.steer = 0
        self.spin = 0
        self.r_vx = 0
        self.r_vy = 0
        self.r_w = 0
        self.r_steer = 0
        self.r_spin = 0
        self.battery_level = 0
        self.battery_temp = 0
        self.charging = False
        self.voltage = 0
        self.current = 0
        self.brake = False
        self.emergency = False
        self.driver_emc = False
        self.blocked = False
        self.block_reason = -1
        self.block_x = 0
        self.block_y = 0
        self.slowed = False
        self.slow_reason = -1
        self.slow_x = 0
        self.slow_y = 0
        self.yaw = 0
        self.roll = 0
        self.pitch = 0
        self.lasers = []
        self.send_vx = 0
        self.send_vy = 0
        self.send_vw = 0
        self.send_steer = 0
        self.send_real_steer = 0
        self.is_steer_robot = False
        self.max_x = 0.5
        self.max_w = 0.7
        self.current_x = 0.1
        self.current_w = 0.1

        data = self.get_status(R_STATUS['robot_status_info_req'])
        if data:
            self.id = data["id"]
            self.model = data["model"]
            self.version = data["version"]
            self.current_ip = data["current_ip"]

        self.update_status()
        self.update_laser_status()

        if control:
            self.control_conn = Connector(ip, 19205)

    def get_status(self, api_type):
        if not self.conn.is_connected:
            self.conn.connect()
        status, data = self.conn.send(api_type)
        if status == False:
            status, data = self.conn.send(api_type)
            if status == False:
                self.message = "不能连接获取机器人信息，请检查连接！"
                self.conn.close()
                return None
        # self.conn.close()
        # print(data.data)
        if "ret_code" in data.data.keys() and data.data["ret_code"] != 0:
            self.message = data.data["message"]
            return None
        return data.data

    def send_control(self, api_type, data=None):
        if not self.control_conn.is_connected:
            self.control_conn.connect()
        status, recv_data = self.control_conn.send(api_type, data)
        if status == False:
            status, recv_data = self.control_conn.send(api_type, data)
            if status == False:
                self.message = "不能向机器人发送指令，请检查连接！"
                self.conn.close()
                return None
        if "ret_code" in data.data.keys() and recv_data.data["ret_code"] != 0:
            self.message = recv_data.data["message"]
            return None
        return recv_data.data

    def update_status(self):
        self.update_location_status()
        self.update_speed_status()
        self.update_battery_status()
        self.update_break_status()
        self.update_emergency_status()
        self.update_block_status()
        self.update_imu_status()

    def update_location_status(self):
        # update localtion status
        data = self.get_status(R_STATUS['robot_status_loc_req'])
        if data:
            self.x = data['x']
            self.y = data['y']
            self.angle = data['angle']
            self.confidence = data['confidence']

    def update_speed_status(self):
        # update speed status
        data = self.get_status(R_STATUS['robot_status_speed_req'])
        if data:
            self.vx = data["vx"]
            self.vy = data["vy"]
            self.w = data["w"]
            self.steer = data["steer"]
            self.spin = data["spin"]
            self.r_vx = data["r_vx"]
            self.r_vy = data["r_vy"]
            self.r_w = data["r_w"]
            self.r_steer = data["r_steer"]
            self.r_spin = data["r_spin"]

    def update_battery_status(self):
        # update battery status
        data = self.get_status(R_STATUS['robot_status_battery_req'])
        if data:
            self.battery_level = data['battery_level']
            self.battery_temp = data['battery_temp']
            self.charging = data['charging']
            self.voltage = data['voltage']
            self.current = data['current']

    def update_break_status(self):
        data = self.get_status(R_STATUS['robot_status_brake_req'])
        if data and 'brake' in data:
            self.brake = data['brake']

    def update_emergency_status(self):
        data = self.get_status(R_STATUS['robot_status_emergency_req'])
        if data:
            self.emergency = data['emergency']
            self.driver_emc = data['driver_emc']

    def update_block_status(self):
        data = self.get_status(R_STATUS['robot_status_block_req'])
        if data:
            self.blocked = data['blocked']
            if self.blocked:
                # self.block_reason = data['block_reason']
                self.block_x = data['block_x']
                self.block_y = data['block_y']

    def update_imu_status(self):
        data = self.get_status(R_STATUS['robot_status_imu_req'])
        if data:
            self.yaw = data['yaw']
            self.roll = data['roll']
            self.pitch = data['pitch']

    def update_laser_status(self):
        data = self.get_status(R_STATUS['robot_status_laser_req'])
        if data:
            for laser in data['lasers']:
                self.lasers.append(Laser(
                    laser['beams'],
                    laser['device_info'],
                    laser['header'],
                    laser['install_info'],
                ))

    def stop_control(self):
        self.send_control(R_CONTROL['robot_control_stop_req'])

    def set_velocity(self):
        data = {}
        data['vx'] = self.send_vx
        data['vy'] = self.send_vy
        data['w'] = self.send_vw
        if self.is_steer_robot:
            data['steer'] = self.send_steer
            data['real_steer'] = self.send_real_steer
        self.send_control(R_CONTROL['robot_control_motion_req'], data)

    def point(self, direction):
        if direction[0] == Direction.Forward():
            self.send_vx = self.current_x
        elif direction[0] == Direction.Backward():
            self.send_vx = -1 * self.current_x
        if direction[1] == Direction.Left():
            self.send_vw = self.current_w
        elif direction[1] == Direction.Right():
            self.send_vw = -1 * self.current_w
        self.set_velocity()

    def increase_speed(self):
        if self.current_x + 0.1 <= self.max_x:
            self.current_x += 0.1
        if self.current_w + 0.1 <= self.max_w:
            self.current_w += 0.1
    
    def decrease_speed(self):
        if self.current_x - 0.1 >= 0:
            self.current_x -= 0.1
        if self.current_w - 0.1 >= 0:
            self.current_w -= 0.1

    def close(self):
        if self.conn.is_connected:
            self.conn.close()
        if self.control_conn.is_connected:
            self.control_conn.close()
