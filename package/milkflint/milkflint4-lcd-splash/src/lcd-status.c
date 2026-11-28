/*
 * Paint a Monokai-milk-ish status panel on /dev/fb0 (320×240 RGB565).
 * Usage: lcd-status wan|wifi|clients|vpn|system
 * Cheap status from /proc or uci when available; otherwise placeholders.
 */
#include <errno.h>
#include <fcntl.h>
#include <linux/fb.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>

#define W 320
#define H 240

#define RGB565(r, g, b) ((uint16_t)((((r) & 0xf8) << 8) | (((g) & 0xfc) << 3) | (((b) & 0xf8) >> 3)))

/* Monokai milk dark: charcoal panel, milk text, pink / cyan accents. */
static const uint16_t COL_BG = RGB565(0x2d, 0x2a, 0x2e);
static const uint16_t COL_PANEL = RGB565(0x1e, 0x1b, 0x1e);
static const uint16_t COL_TEXT = RGB565(0xfc, 0xfc, 0xfa);
static const uint16_t COL_MUTED = RGB565(0x93, 0x92, 0x93);
static const uint16_t COL_PINK = RGB565(0xfc, 0x61, 0x8d);
static const uint16_t COL_CYAN = RGB565(0x78, 0xdc, 0xe8);
static const uint16_t COL_BAR = RGB565(0x40, 0x3c, 0x41);

/* Tiny 5×7 glyphs: columns of bits, LSB = top. Space, digits, A–Z, some punct. */
static const uint8_t FONT_5X7[][5] = {
	/* ' ' */ {0x00, 0x00, 0x00, 0x00, 0x00},
	/* '!' */ {0x00, 0x00, 0x5f, 0x00, 0x00},
	/* '"' */ {0x00, 0x07, 0x00, 0x07, 0x00},
	/* '#' */ {0x14, 0x7f, 0x14, 0x7f, 0x14},
	/* '$' */ {0x24, 0x2a, 0x7f, 0x2a, 0x12},
	/* '%' */ {0x23, 0x13, 0x08, 0x64, 0x62},
	/* '&' */ {0x36, 0x49, 0x55, 0x22, 0x50},
	/* ''' */ {0x00, 0x05, 0x03, 0x00, 0x00},
	/* '(' */ {0x00, 0x1c, 0x22, 0x41, 0x00},
	/* ')' */ {0x00, 0x41, 0x22, 0x1c, 0x00},
	/* '*' */ {0x14, 0x08, 0x3e, 0x08, 0x14},
	/* '+' */ {0x08, 0x08, 0x3e, 0x08, 0x08},
	/* ',' */ {0x00, 0x50, 0x30, 0x00, 0x00},
	/* '-' */ {0x08, 0x08, 0x08, 0x08, 0x08},
	/* '.' */ {0x00, 0x60, 0x60, 0x00, 0x00},
	/* '/' */ {0x20, 0x10, 0x08, 0x04, 0x02},
	/* '0' */ {0x3e, 0x51, 0x49, 0x45, 0x3e},
	/* '1' */ {0x00, 0x42, 0x7f, 0x40, 0x00},
	/* '2' */ {0x42, 0x61, 0x51, 0x49, 0x46},
	/* '3' */ {0x21, 0x41, 0x45, 0x4b, 0x31},
	/* '4' */ {0x18, 0x14, 0x12, 0x7f, 0x10},
	/* '5' */ {0x27, 0x45, 0x45, 0x45, 0x39},
	/* '6' */ {0x3c, 0x4a, 0x49, 0x49, 0x30},
	/* '7' */ {0x01, 0x71, 0x09, 0x05, 0x03},
	/* '8' */ {0x36, 0x49, 0x49, 0x49, 0x36},
	/* '9' */ {0x06, 0x49, 0x49, 0x29, 0x1e},
	/* ':' */ {0x00, 0x36, 0x36, 0x00, 0x00},
	/* ';' */ {0x00, 0x56, 0x36, 0x00, 0x00},
	/* '<' */ {0x08, 0x14, 0x22, 0x41, 0x00},
	/* '=' */ {0x14, 0x14, 0x14, 0x14, 0x14},
	/* '>' */ {0x00, 0x41, 0x22, 0x14, 0x08},
	/* '?' */ {0x02, 0x01, 0x51, 0x09, 0x06},
	/* '@' */ {0x32, 0x49, 0x79, 0x41, 0x3e},
	/* 'A' */ {0x7e, 0x11, 0x11, 0x11, 0x7e},
	/* 'B' */ {0x7f, 0x49, 0x49, 0x49, 0x36},
	/* 'C' */ {0x3e, 0x41, 0x41, 0x41, 0x22},
	/* 'D' */ {0x7f, 0x41, 0x41, 0x22, 0x1c},
	/* 'E' */ {0x7f, 0x49, 0x49, 0x49, 0x41},
	/* 'F' */ {0x7f, 0x09, 0x09, 0x09, 0x01},
	/* 'G' */ {0x3e, 0x41, 0x49, 0x49, 0x7a},
	/* 'H' */ {0x7f, 0x08, 0x08, 0x08, 0x7f},
	/* 'I' */ {0x00, 0x41, 0x7f, 0x41, 0x00},
	/* 'J' */ {0x20, 0x40, 0x41, 0x3f, 0x01},
	/* 'K' */ {0x7f, 0x08, 0x14, 0x22, 0x41},
	/* 'L' */ {0x7f, 0x40, 0x40, 0x40, 0x40},
	/* 'M' */ {0x7f, 0x02, 0x0c, 0x02, 0x7f},
	/* 'N' */ {0x7f, 0x04, 0x08, 0x10, 0x7f},
	/* 'O' */ {0x3e, 0x41, 0x41, 0x41, 0x3e},
	/* 'P' */ {0x7f, 0x09, 0x09, 0x09, 0x06},
	/* 'Q' */ {0x3e, 0x41, 0x51, 0x21, 0x5e},
	/* 'R' */ {0x7f, 0x09, 0x19, 0x29, 0x46},
	/* 'S' */ {0x46, 0x49, 0x49, 0x49, 0x31},
	/* 'T' */ {0x01, 0x01, 0x7f, 0x01, 0x01},
	/* 'U' */ {0x3f, 0x40, 0x40, 0x40, 0x3f},
	/* 'V' */ {0x1f, 0x20, 0x40, 0x20, 0x1f},
	/* 'W' */ {0x3f, 0x40, 0x38, 0x40, 0x3f},
	/* 'X' */ {0x63, 0x14, 0x08, 0x14, 0x63},
	/* 'Y' */ {0x07, 0x08, 0x70, 0x08, 0x07},
	/* 'Z' */ {0x61, 0x51, 0x49, 0x45, 0x43},
};

static const uint8_t *glyph(char c)
{
	if (c >= 'a' && c <= 'z')
		c = (char)(c - 'a' + 'A');
	if (c >= ' ' && c <= 'Z')
		return FONT_5X7[(unsigned)(c - ' ')];
	return FONT_5X7[0];
}

static void put_px(uint8_t *fb, unsigned line_len, unsigned x, unsigned y, uint16_t c)
{
	uint16_t *p;
	if (x >= W || y >= H)
		return;
	p = (uint16_t *)(fb + (size_t)y * line_len + (size_t)x * 2);
	*p = c;
}

static void fill_rect(uint8_t *fb, unsigned line_len, unsigned x, unsigned y, unsigned w, unsigned h, uint16_t c)
{
	unsigned yy, xx;
	for (yy = y; yy < y + h && yy < H; yy++)
		for (xx = x; xx < x + w && xx < W; xx++)
			put_px(fb, line_len, xx, yy, c);
}

static void draw_char(uint8_t *fb, unsigned line_len, unsigned x, unsigned y, char ch, uint16_t c, unsigned scale)
{
	const uint8_t *g = glyph(ch);
	unsigned col, row, sx, sy;
	for (col = 0; col < 5; col++) {
		uint8_t bits = g[col];
		for (row = 0; row < 7; row++) {
			if (bits & (1u << row)) {
				for (sy = 0; sy < scale; sy++)
					for (sx = 0; sx < scale; sx++)
						put_px(fb, line_len, x + col * scale + sx, y + row * scale + sy, c);
			}
		}
	}
}

static void draw_text(uint8_t *fb, unsigned line_len, unsigned x, unsigned y, const char *s, uint16_t c, unsigned scale)
{
	unsigned adv = 6 * scale;
	for (; *s; s++) {
		if (*s == '\n')
			continue;
		draw_char(fb, line_len, x, y, *s, c, scale);
		x += adv;
		if (x + adv > W)
			break;
	}
}

static int unblank(void)
{
	int fd = open("/sys/class/graphics/fb0/blank", O_WRONLY);
	if (fd < 0)
		return -1;
	if (write(fd, "0\n", 2) < 0) {
		close(fd);
		return -1;
	}
	close(fd);
	return 0;
}

static void trim_nl(char *s)
{
	size_t n = strlen(s);
	while (n > 0 && (s[n - 1] == '\n' || s[n - 1] == '\r'))
		s[--n] = '\0';
}

static int read_line_file(const char *path, char *buf, size_t buflen)
{
	FILE *f = fopen(path, "r");
	if (!f)
		return -1;
	if (!fgets(buf, (int)buflen, f)) {
		fclose(f);
		return -1;
	}
	fclose(f);
	trim_nl(buf);
	return 0;
}

static int read_cmd(const char *cmd, char *buf, size_t buflen)
{
	FILE *f = popen(cmd, "r");
	if (!f)
		return -1;
	if (!fgets(buf, (int)buflen, f)) {
		pclose(f);
		return -1;
	}
	pclose(f);
	trim_nl(buf);
	return 0;
}

static void uptime_line(char *out, size_t outlen)
{
	double up = 0;
	unsigned d, h, m;
	FILE *f = fopen("/proc/uptime", "r");
	if (!f || fscanf(f, "%lf", &up) != 1) {
		if (f)
			fclose(f);
		snprintf(out, outlen, "Uptime —");
		return;
	}
	fclose(f);
	d = (unsigned)(up / 86400.0);
	h = (unsigned)((up - d * 86400.0) / 3600.0);
	m = (unsigned)((up - d * 86400.0 - h * 3600.0) / 60.0);
	if (d > 0)
		snprintf(out, outlen, "Up %ud %uh %um", d, h, m);
	else if (h > 0)
		snprintf(out, outlen, "Up %uh %um", h, m);
	else
		snprintf(out, outlen, "Up %um", m);
}

static void load_line(char *out, size_t outlen)
{
	char buf[64];
	if (read_line_file("/proc/loadavg", buf, sizeof(buf)) == 0) {
		char *sp = strchr(buf, ' ');
		if (sp)
			*sp = '\0';
		snprintf(out, outlen, "Load %.12s", buf);
	} else {
		snprintf(out, outlen, "Load —");
	}
}

static void short_copy(char *dst, size_t dstlen, const char *prefix, const char *src)
{
	char tmp[48];
	snprintf(tmp, sizeof(tmp), "%s", src);
	snprintf(dst, dstlen, "%s%s", prefix, tmp);
}

static void wan_lines(char *l1, size_t n1, char *l2, size_t n2, char *l3, size_t n3)
{
	char buf[128];
	snprintf(l1, n1, "WAN");
	if (read_cmd("uci -q get network.wan.ifname 2>/dev/null || uci -q get network.wan.device 2>/dev/null", buf, sizeof(buf)) == 0 &&
	    buf[0]) {
		short_copy(l2, n2, "Iface ", buf);
	} else {
		snprintf(l2, n2, "Iface wan");
	}
	if (read_cmd("ip -4 -o addr show scope global 2>/dev/null | awk '{print $4; exit}'", buf, sizeof(buf)) == 0 && buf[0]) {
		char *slash = strchr(buf, '/');
		if (slash)
			*slash = '\0';
		short_copy(l3, n3, "IP ", buf);
	} else {
		snprintf(l3, n3, "IP —");
	}
}

static void wifi_lines(char *l1, size_t n1, char *l2, size_t n2, char *l3, size_t n3)
{
	char buf[128];
	snprintf(l1, n1, "Wi-Fi");
	if (read_cmd("uci -q get wireless.@wifi-iface[0].ssid 2>/dev/null", buf, sizeof(buf)) == 0 && buf[0])
		short_copy(l2, n2, "SSID ", buf);
	else
		snprintf(l2, n2, "SSID —");
	if (read_cmd("iwinfo 2>/dev/null | grep -c 'ESSID:'", buf, sizeof(buf)) == 0 && buf[0])
		short_copy(l3, n3, "Radios ", buf);
	else
		snprintf(l3, n3, "Radios —");
}

static void clients_lines(char *l1, size_t n1, char *l2, size_t n2, char *l3, size_t n3)
{
	char buf[128];
	snprintf(l1, n1, "Clients");
	if (read_cmd("cat /tmp/dhcp.leases 2>/dev/null | wc -l", buf, sizeof(buf)) == 0 && buf[0])
		short_copy(l2, n2, "Leases ", buf);
	else
		snprintf(l2, n2, "Leases —");
	snprintf(l3, n3, "Live —");
}

static void vpn_lines(char *l1, size_t n1, char *l2, size_t n2, char *l3, size_t n3)
{
	char buf[128];
	snprintf(l1, n1, "VPN");
	if (read_cmd("uci -q get milkflint.vpn.enabled 2>/dev/null", buf, sizeof(buf)) == 0) {
		if (buf[0] == '1' || strcmp(buf, "true") == 0)
			snprintf(l2, n2, "Client on");
		else
			snprintf(l2, n2, "Client off");
	} else {
		snprintf(l2, n2, "Client —");
	}
	snprintf(l3, n3, "Kill-switch —");
}

static void system_lines(char *l1, size_t n1, char *l2, size_t n2, char *l3, size_t n3)
{
	snprintf(l1, n1, "System");
	uptime_line(l2, n2);
	load_line(l3, n3);
}

int main(int argc, char **argv)
{
	const char *kind = argc > 1 ? argv[1] : "system";
	char title[48], line2[64], line3[64];
	uint8_t *fb = MAP_FAILED;
	struct fb_var_screeninfo vinfo;
	struct fb_fix_screeninfo finfo;
	int fb_fd = -1;
	int rc = 1;
	unsigned y;

	if (strcmp(kind, "wan") == 0)
		wan_lines(title, sizeof(title), line2, sizeof(line2), line3, sizeof(line3));
	else if (strcmp(kind, "wifi") == 0)
		wifi_lines(title, sizeof(title), line2, sizeof(line2), line3, sizeof(line3));
	else if (strcmp(kind, "clients") == 0)
		clients_lines(title, sizeof(title), line2, sizeof(line2), line3, sizeof(line3));
	else if (strcmp(kind, "vpn") == 0)
		vpn_lines(title, sizeof(title), line2, sizeof(line2), line3, sizeof(line3));
	else
		system_lines(title, sizeof(title), line2, sizeof(line2), line3, sizeof(line3));

	for (unsigned i = 0; i < 30; i++) {
		fb_fd = open("/dev/fb0", O_RDWR);
		if (fb_fd >= 0)
			break;
		usleep(200000);
	}
	if (fb_fd < 0) {
		perror("/dev/fb0");
		goto out;
	}
	if (ioctl(fb_fd, FBIOGET_VSCREENINFO, &vinfo) < 0 || ioctl(fb_fd, FBIOGET_FSCREENINFO, &finfo) < 0) {
		perror("fbioget");
		goto out;
	}
	if (vinfo.bits_per_pixel != 16) {
		fprintf(stderr, "unexpected bpp %u\n", vinfo.bits_per_pixel);
		goto out;
	}

	fb = mmap(NULL, finfo.smem_len, PROT_READ | PROT_WRITE, MAP_SHARED, fb_fd, 0);
	if (fb == MAP_FAILED) {
		perror("mmap");
		goto out;
	}

	unblank();

	/* Clear to dark milk. */
	for (y = 0; y < vinfo.yres; y++) {
		uint16_t *row = (uint16_t *)(fb + (size_t)y * finfo.line_length);
		unsigned x;
		for (x = 0; x < vinfo.xres; x++)
			row[x] = COL_BG;
	}

	/* Inner panel. */
	fill_rect(fb, finfo.line_length, 12, 12, W - 24, H - 24, COL_PANEL);
	fill_rect(fb, finfo.line_length, 12, 12, W - 24, 4, COL_PINK);
	fill_rect(fb, finfo.line_length, 12, H - 16, W - 24, 4, COL_CYAN);
	fill_rect(fb, finfo.line_length, 24, 56, W - 48, 2, COL_BAR);

	draw_text(fb, finfo.line_length, 28, 28, title, COL_PINK, 3);
	draw_text(fb, finfo.line_length, 28, 80, line2, COL_TEXT, 2);
	draw_text(fb, finfo.line_length, 28, 120, line3, COL_MUTED, 2);
	draw_text(fb, finfo.line_length, 28, 190, "MilkFlint4", COL_CYAN, 2);

	msync(fb, finfo.smem_len, MS_SYNC);
	rc = 0;

out:
	if (fb != MAP_FAILED)
		munmap(fb, finfo.smem_len);
	if (fb_fd >= 0)
		close(fb_fd);
	return rc;
}
