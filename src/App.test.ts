// src/App.test.ts
import { describe, expect, test } from "bun:test";

describe("오디오 플레이어 로직 테스트", () => {
  test("시간 포맷팅 함수 테스트", () => {
    // formatTime 함수 로직을 테스트한다고 가정
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(120)).toBe("2:00");
  });
});
