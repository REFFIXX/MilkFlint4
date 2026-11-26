/*
 * Paint a pre-baked RGB565 splash onto /dev/fb0, respecting stride.
 * Asset is always 320x240 little-endian RGB565; panel may pad rows.
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

#ifndef SPLASH_PATH
#define SPLASH_PATH "/usr/share/milkflint4/lcd-splash.rgb565"
#endif

#define SPLASH_W 320
#define SPLASH_H 240
#define SPLASH_BPP 2
#define SPLASH_BYTES (SPLASH_W * SPLASH_H * SPLASH_BPP)

static int unblank(const char *path)
{
	int fd = open(path, O_WRONLY);
	if (fd < 0)
		return -1;
	if (write(fd, "0\n", 2) < 0) {
		close(fd);
		return -1;
	}
	close(fd);
	return 0;
}

int main(void)
{
	uint8_t *splash = NULL;
	uint8_t *fb = MAP_FAILED;
	struct fb_var_screeninfo vinfo;
	struct fb_fix_screeninfo finfo;
	size_t got;
	int fb_fd = -1, splash_fd = -1;
	int rc = 1;
	unsigned y;

	splash_fd = open(SPLASH_PATH, O_RDONLY);
	if (splash_fd < 0) {
		perror(SPLASH_PATH);
		goto out;
	}

	splash = malloc(SPLASH_BYTES);
	if (!splash) {
		perror("malloc");
		goto out;
	}

	got = 0;
	while (got < SPLASH_BYTES) {
		ssize_t n = read(splash_fd, splash + got, SPLASH_BYTES - got);
		if (n < 0) {
			perror("read splash");
			goto out;
		}
		if (n == 0)
			break;
		got += (size_t)n;
	}
	if (got != SPLASH_BYTES) {
		fprintf(stderr, "splash size %zu, expected %d\n", got, SPLASH_BYTES);
		goto out;
	}

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

	if (ioctl(fb_fd, FBIOGET_VSCREENINFO, &vinfo) < 0 ||
	    ioctl(fb_fd, FBIOGET_FSCREENINFO, &finfo) < 0) {
		perror("fbioget");
		goto out;
	}

	if (vinfo.bits_per_pixel != 16) {
		fprintf(stderr, "unexpected bpp %u (want 16)\n", vinfo.bits_per_pixel);
		goto out;
	}

	/* Prefer panel-native size; still paint if close (letterbox handled in asset). */
	if (vinfo.xres < SPLASH_W || vinfo.yres < SPLASH_H) {
		fprintf(stderr, "fb %ux%u too small for %dx%d splash\n",
			vinfo.xres, vinfo.yres, SPLASH_W, SPLASH_H);
		goto out;
	}

	fb = mmap(NULL, finfo.smem_len, PROT_READ | PROT_WRITE, MAP_SHARED, fb_fd, 0);
	if (fb == MAP_FAILED) {
		perror("mmap");
		goto out;
	}

	unblank("/sys/class/graphics/fb0/blank");

	for (y = 0; y < SPLASH_H; y++) {
		uint8_t *dst = fb + (size_t)y * finfo.line_length;
		const uint8_t *src = splash + (size_t)y * SPLASH_W * SPLASH_BPP;
		memcpy(dst, src, (size_t)SPLASH_W * SPLASH_BPP);
		/* Clear any right-side padding / leftover on wider panels. */
		if (finfo.line_length > (unsigned)SPLASH_W * SPLASH_BPP)
			memset(dst + SPLASH_W * SPLASH_BPP, 0,
			       finfo.line_length - (unsigned)SPLASH_W * SPLASH_BPP);
	}
	/* Clear rows below splash if taller. */
	for (; y < vinfo.yres; y++) {
		uint8_t *dst = fb + (size_t)y * finfo.line_length;
		memset(dst, 0, finfo.line_length);
	}

	msync(fb, finfo.smem_len, MS_SYNC);
	rc = 0;

out:
	if (fb != MAP_FAILED)
		munmap(fb, finfo.smem_len);
	if (fb_fd >= 0)
		close(fb_fd);
	if (splash_fd >= 0)
		close(splash_fd);
	free(splash);
	return rc;
}
