import pygame
import pygame.joystick
import ipaddress
import sys
import time
from seer_sdk.controller import Robot

BLACK = (0,   0,   0)
WHITE = (255, 255, 255)

class TextPrint:
    def __init__(self):
        self.reset()
        self.font = pygame.font.Font(None, 18)

    def print(self, screen, textString):
        textBitmap = self.font.render(textString, True, BLACK)
        screen.blit(textBitmap, [self.x, self.y])
        self.y += self.line_height

    def reset(self):
        self.x = 10
        self.y = 10
        self.line_height = 15

    def indent(self):
        self.x += 10

    def unindent(self):
        self.x -= 10

print('intput ip address:')
ip = input()
try:
    ip_address = ipaddress.ip_address(ip)
except:
    print("wrong format of ip")
    sys.exit(1)

pygame.init()
SCREEN_WIDTH, SCREEN_HEIGHT = 1024, 800
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), 0, 32)
surface = pygame.Surface(screen.get_size())
surface = surface.convert()
surface.fill((255, 255, 255))
screen.blit(surface, (0, 0))

textPrint = TextPrint()
textPrint.reset()

joystick_count = pygame.joystick.get_count()
if joystick_count == 0:
    print("No joystick founded")
    time.sleep(10)
    pygame.quit()
    sys.exit()

print(joystick_count)
joystick = pygame.joystick.Joystick(0)
joystick.init()

textPrint.print(screen, "Number of joysticks: {}".format(joystick_count))
textPrint.indent()

robot = Robot(ip, True)

x = 0.1
w = 0.1
max_x = 0.5
max_w = 0.7

while True:
    for event in pygame.event.get():
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_w:
                robot.send_vx = x
                robot.set_velocity()
            elif event.key == pygame.K_s:
                robot.send_vx = -1 * x
                robot.set_velocity()
            elif event.key == pygame.K_a:
                robot.send_vw = w
                robot.set_velocity()
            elif event.key == pygame.K_d:
                robot.send_vw = -1 * w
                robot.set_velocity()
            elif event.key == pygame.K_u:
                if x + 0.1 <= max_x:
                    x += 0.1
                if w + 0.1 <= max_w:
                    w += 0.1
            elif event.key == pygame.K_j:
                if x - 0.1 >= 0:
                    x -= 0.1
                if w - 0.1 >= 0:
                    w -= 0.1
            elif event.key == pygame.K_q:
                robot.stop_control()
        elif event.type == pygame.KEYUP:
            if event.key == pygame.K_w or event.key == pygame.K_s:
                robot.send_vx = 0
                robot.set_velocity()
            elif event.key == pygame.K_a or event.key == pygame.K_d:
                robot.send_vw = 0
                robot.set_velocity()
        elif event.type == pygame.JOYHATMOTION:
            hat = joystick.get_hat(0)
            print(hat[0], hat[1])
            if hat[1] == 1:
                robot.send_vx = x
            if hat[1] == 0:
                robot.send_vx = 0
            if hat[0] == 0:
                robot.send_vw = 0
            if hat[1] == -1:
                robot.send_vx = -1 * x
            if hat[0] == -1:
                robot.send_vw = w
            if hat[0] == 1:
                robot.send_vw = -1 * w
            robot.set_velocity()

        elif event.type == pygame.JOYBUTTONDOWN:
            button_up = joystick.get_button(6)
            button_down = joystick.get_button(7)
            button_stop = joystick.get_button(2)
            print(button_down, button_up, button_stop)
            if button_stop == 1:
                robot.stop_control()
            elif button_up == 1:
                if x + 0.1 <= max_x:
                    x += 0.1
                if w + 0.1 <= max_w:
                    w += 0.1
            elif button_down == 1:
                if x - 0.1 >= 0:
                    x -= 0.1
                if w - 0.1 >= 0:
                    w -= 0.1
        elif event.type == pygame.QUIT:
            robot.close()
            pygame.quit()

    # robot.update_status()
    # print("Velocity: vs: {:>4} \t vy: {:>4} \t w: {:>4} \t steer: {:>4} ".format(
    #     robot.vx, robot.vy, robot.w, robot.steer))
    # print("Localtion: \t x: {:>4} \t y: {:>4} \t angle: {:>4} ".format(
    #     robot.x, robot.y, robot.angle))
    # print( "Imu: \t yaw: {:>4} \t pitch: {:>4} \t roll: {:>4} ".format(
    #     robot.yaw, robot.pitch, robot.roll))
    # print("LiDAR: {} packages ".format(
    #     len(robot.lasers[0].beams)))
    # print("Robot: \t battery_level: {:>2} \t  battery_temp: {:>2}".format(
    #     robot.battery_level, robot.battery_temp))