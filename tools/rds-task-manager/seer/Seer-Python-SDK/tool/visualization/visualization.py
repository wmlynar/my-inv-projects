import tkinter as tk
import math
import ipaddress
import platform
import subprocess
from matplotlib.backends.backend_tkagg import (
    FigureCanvasTkAgg, NavigationToolbar2Tk)
# Implement the default Matplotlib key bindings.
from matplotlib.backend_bases import key_press_handler
from matplotlib.figure import Figure
import matplotlib.animation as animation


from seer_sdk.controller import Robot

def on_key_press(event):
    print("you pressed {}".format(event.key))
    key_press_handler(event, canvas, toolbar)

def ping(host):
    """
    Returns True if host (str) responds to a ping request.
    Remember that a host may not respond to a ping (ICMP) request even if the host name is valid.
    """

    # Option for the number of packets as a function of
    param = '-n' if platform.system().lower()=='windows' else '-c'

    # Building the command. Ex: "ping -c 1 google.com"
    command = ['ping', param, '1', host]

    return subprocess.call(command) == 0

class Application(tk.Frame):
    def __init__(self, master=None):
        super().__init__(master)
        self.master = master
        self.robot = None
        self.vxs = [0] * 400
        self.vys = [0] * 400
        self.vws = [0] * 400
        self.xs = [0] * 400
        self.ys = [0] * 400
        self.batter_levels = [0] * 400
        self.pack()
        self.create_widgets()

    def create_widgets(self):
        self.ip_frame = tk.Frame(self)

        self.label_ip = tk.Label(self.ip_frame, text="IP:")
        self.label_ip.pack(side=tk.LEFT, padx=2)

        self.input_ip = tk.Entry(self.ip_frame)
        self.input_ip.pack(side=tk.LEFT)

        self.ping_button = tk.Button(self.ip_frame, text="Ping", command=self.ping_ip)
        self.ping_button.pack(side=tk.LEFT, padx=4)

        self.connect_button = tk.Button(self.ip_frame, text="Connect", state=tk.DISABLED, command=self.connect)
        self.connect_button.pack(side=tk.LEFT, padx=2)
        self.ip_frame.pack()

        self.text = tk.Text(self, height=5)
        self.text.insert(1.0, "The output meassage window")
        self.text.pack(fill=tk.X)

        self.quit = tk.Button(self, text="QUIT", fg="red",
                              command=self.master.destroy)
        self.quit.pack(side=tk.BOTTOM)
    
    def ping_ip(self):
        ip = self.input_ip.get()
        ip_valid = False
        try:
            ipaddress.ip_address(ip)
            ip_valid = True
        except:
            ip_valid = False
        if ip_valid == False:
            self.text.delete(1.0, tk.END)
            self.text.insert(1.0, "Not a valid ip address!")
        else:
            if ping(ip):
                self.text.delete(1.0, tk.END)
                self.text.insert(1.0, "Ping success!")
                self.connect_button.config(state=tk.NORMAL)
            else:
                self.text.delete(1.0, tk.END)
                self.text.insert(1.0, "Ping false!")

    def animate(self):
        # print("robot status update!")
        self.robot.update_status()
        self.vxs.append(self.robot.vx)
        self.vys.append(self.robot.vy)
        self.vws.append(self.robot.w)
        self.xs.append(self.robot.x)
        self.ys.append(self.robot.y)
        self.batter_levels.append(self.robot.battery_level)

        self.vxs = self.vxs[1:]
        self.vys = self.vys[1:]
        self.vws = self.vws[1:]
        self.xs = self.xs[1:]
        self.ys = self.ys[1:]
        self.batter_levels = self.batter_levels[1:]

        self.fig_velocity_plot1.cla()
        self.fig_velocity_plot2.cla()
        self.fig_velocity_plot3.cla()
        self.fig_velocity_plot4.cla()
        self.fig_velocity_plot5.cla()
        self.fig_velocity_plot6.cla()
        self.fig_velocity_plot1.plot(self.vxs)
        self.fig_velocity_plot2.plot(self.vys)
        self.fig_velocity_plot3.plot(self.vws)
        self.fig_velocity_plot4.plot(self.xs, self.ys)
        self.fig_velocity_plot5.plot(self.batter_levels)

        thetas = [i['angle'] + self.robot.angle for i in self.robot.lasers[0].beams]
        radius = [i['dist'] for i in self.robot.lasers[0].beams]
        x = [radius[i] * math.cos(thetas[i] * math.pi / 180) for i in range(len(thetas))]
        y = [radius[i] * math.sin(thetas[i] * math.pi / 180) for i in range(len(thetas))]
        self.fig_velocity_plot6.plot(x, y)

        self.canvas.draw()

        self.master.after(100, self.animate)

    def connect(self):
        ip = self.input_ip.get()
        try:
            self.robot = Robot(ip)
        except Exception as e:
            self.text.delete(1.0, tk.END)
            self.text.insert(1.0, "Can not connect to robot\n")
            self.text.insert(tk.END, str(e))
            return

        # self.vxs.append(self.robot.vx)
        # self.vys.append(self.robot.vy)
        # self.vws.append(self.robot.w)
        # self.xs.append(self.robot.x)
        # self.ys.append(self.robot.y)
        # self.batter_levels.append(self.robot.battery_level)

        # self.vxs = self.vxs[1:]
        # self.vys = self.vys[1:]
        # self.vws = self.vws[1:]
        # self.xs = self.xs[1:]
        # self.ys = self.ys[1:]
        # self.batter_levels = self.batter_levels[1:]

        self.fig_velocity = Figure(figsize=(20, 8), dpi=100)
        # self.fig_velocity.set_title('Velocity')
        self.fig_velocity_plot1 = self.fig_velocity.add_subplot(231)
        self.fig_velocity_plot2 = self.fig_velocity.add_subplot(232)
        self.fig_velocity_plot3 = self.fig_velocity.add_subplot(233)
        self.fig_velocity_plot4 = self.fig_velocity.add_subplot(234)
        self.fig_velocity_plot5 = self.fig_velocity.add_subplot(235)
        self.fig_velocity_plot6 = self.fig_velocity.add_subplot(236)
        self.fig_velocity_plot1.title.set_text('vx')
        self.fig_velocity_plot2.title.set_text('vy')
        self.fig_velocity_plot3.title.set_text('w')
        self.fig_velocity_plot4.title.set_text('x-y')
        self.fig_velocity_plot5.title.set_text('battery level')
        self.fig_velocity_plot6.set_title('lidar')
        # self.fig_velocity_plot1.plot(self.vxs)
        # self.fig_velocity_plot2.plot(self.vys)
        # self.fig_velocity_plot3.plot(self.vws)

        self.canvas = FigureCanvasTkAgg(self.fig_velocity, master=self)  # A tk.DrawingArea.
        self.canvas.draw()
        self.canvas.get_tk_widget().pack(side=tk.BOTTOM, fill=tk.X, expand=1)

        # toolbar = NavigationToolbar2Tk(canvas, self)
        # toolbar.update()
        # canvas.get_tk_widget().pack(side=tk.TOP, fill=tk.BOTH, expand=1)

        # canvas.mpl_connect("key_press_event", on_key_press)
        self.master.after(500, self.animate)
    def say_hi(self):
        print("hi there, everyone!")

root = tk.Tk()
app = Application(master=root)
app.mainloop()