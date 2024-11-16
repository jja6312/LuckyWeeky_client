// components/Calendar.jsx
import React, { useState } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  parseISO,
  differenceInMinutes,
  startOfDay,
  endOfWeek,
} from "date-fns";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheckSquare,
  FaRegSquare,
} from "react-icons/fa";
import useStore from "../stores/useStore";
import useScheduleStore from "../stores/scheduleStore";
import ScheduleModal from "./ScheduleModal";

const WeekHeader = ({ startOfCurrentWeek }) => {
  return (
    <div
      className="grid border-b sticky top-0 bg-white z-10"
      style={{
        gridTemplateColumns: "102.4px repeat(7, minmax(0, 1fr))",
        boxSizing: "border-box",
      }}
    >
      <div className="border-r h-16"></div>
      {[...Array(7)].map((_, index) => {
        const day = addDays(startOfCurrentWeek, index);
        const isCurrentDay = isToday(day);

        return (
          <div
            key={index}
            className="border-r text-center h-16 flex items-center justify-center"
          >
            <div className="flex justify-center items-center">
              <span
                className={`text-sm ${
                  isCurrentDay ? "font-bold text-black" : "text-gray-500"
                }`}
              >
                {format(day, "EEE")}
              </span>
              <div
                className={`flex items-center justify-center rounded-full w-6 h-6 ${
                  isCurrentDay ? "ml-2 bg-blue-500 text-white font-bold" : ""
                }`}
              >
                <span
                  className={`text-sm ${isCurrentDay ? "" : "text-gray-500"}`}
                >
                  {format(day, "d")}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Calendar = () => {
  const currentWeek = useStore((state) => state.currentWeek);
  const setPrevWeek = useStore((state) => state.setPrevWeek);
  const setNextWeek = useStore((state) => state.setNextWeek);
  const setWeek = useStore((state) => state.setWeek);

  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

  const mainSchedules = useScheduleStore((state) => state.mainSchedules);
  const subschedules = useScheduleStore((state) => state.subschedules);
  const showPastSchedules = useScheduleStore(
    (state) => state.showPastSchedules
  );
  const toggleShowPastSchedules = useScheduleStore(
    (state) => state.toggleShowPastSchedules
  );

  const startOfCurrentWeek = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const handleWeekChange = (event) => {
    const selectedDate = parseISO(event.target.value);
    setWeek(selectedDate);
  };

  const openModal = (schedule, position) => {
    setSelectedSchedule(schedule);
    setModalPosition(position);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalClosing(true);
    setTimeout(() => {
      setModalOpen(false);
      setModalClosing(false);
      setSelectedSchedule(null);
    }, 400); // Duration should match the CSS animation duration
  };

  const handleTimeBlockClick = (dayIndex, hour, quarter, event) => {
    if (modalOpen) {
      // If modal is already open, close it without opening a new one
      closeModal();
      return;
    }

    const clickedDay = new Date(startOfCurrentWeek);
    clickedDay.setDate(clickedDay.getDate() + dayIndex);
    clickedDay.setHours(hour, quarter * 15, 0, 0);

    const startTime = new Date(clickedDay);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 15);

    const newSchedule = {
      mainSchedule: "기본일정(default)", // default mainSchedule
      title: `No title ${format(startTime, "h:mm a")} - ${format(
        endTime,
        "h:mm a"
      )}`,
      start_time: startTime,
      end_time: endTime,
      description: "",
      color: "#eeeaff",
      status: "진행중",
    };

    // 클릭한 시간 블록의 위치로 모달 위치 설정
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetTop = rect.top + window.scrollY;
    const offsetLeft = rect.left + window.scrollX;

    const newPosition = {
      top: offsetTop,
      left: offsetLeft,
    };

    openModal(newSchedule, newPosition);
  };

  const handleModalClose = () => {
    closeModal();
  };

  // 현재 주에 해당하는 일정 필터링
  const filteredSubSchedules = subschedules.filter((schedule) => {
    const scheduleStart = schedule.start_time;
    const scheduleEnd = schedule.end_time;

    // 일정이 현재 주와 겹치는지 확인
    const isOverlapping =
      (scheduleStart >= startOfCurrentWeek &&
        scheduleStart <= endOfCurrentWeek) ||
      (scheduleEnd >= startOfCurrentWeek && scheduleEnd <= endOfCurrentWeek) ||
      (scheduleStart <= startOfCurrentWeek && scheduleEnd >= endOfCurrentWeek);

    if (!isOverlapping) return false;

    // "지난 일정 포함" 옵션 처리
    if (showPastSchedules) {
      return true;
    } else {
      return schedule.end_time >= new Date(startOfDay(new Date()));
    }
  });

  // 시간대를 나타내는 배열 생성 (0시부터 23시까지)
  const hours = [...Array(24)].map((_, i) => i);

  // 일정 렌더링 함수
  const renderSchedules = () => {
    return filteredSubSchedules.map((schedule, index) => {
      const scheduleStart = schedule.start_time;
      const scheduleEnd = schedule.end_time;

      // 하루 총 분
      const totalMinutesInDay = 24 * 60;
      const startOfDayTime = startOfDay(scheduleStart).getTime();

      // 일정의 시작 위치를 계산 (0 ~ 100% 사이)
      const minutesFromTop =
        ((scheduleStart - startOfDayTime) / (totalMinutesInDay * 60000)) * 100;

      // 일정의 길이 계산 (분 단위)
      const scheduleDuration = differenceInMinutes(scheduleEnd, scheduleStart);

      // 일정의 높이 계산 (전체 높이의 퍼센트)
      const scheduleHeight = (scheduleDuration / totalMinutesInDay) * 100;

      // 일정이 시작되는 요일 계산 (0부터 6까지)
      const dayIndex =
        scheduleStart.getDay() === 0 ? 6 : scheduleStart.getDay() - 1; // 일요일 기준을 마지막으로 변경

      return (
        <div
          key={index}
          className="absolute flex justify-center items-center cursor-pointer"
          style={{
            top: `${minutesFromTop}%`,
            height: `${scheduleHeight}%`,
            left: `calc(${dayIndex * (100 / 7)}%)`,
            width: `calc(${100 / 7}% - 1px)`,
            backgroundColor: schedule.color,
            zIndex: 5,
            borderRadius: "0px", // 네모 모양
            overflow: "hidden",
            padding: "2px",
            boxSizing: "border-box",
          }}
        >
          <div className="text-xs text-black text-center">{schedule.title}</div>
        </div>
      );
    });
  };

  return (
    <div
      className="bg-white p-4 rounded-lg shadow-md relative"
      onClick={() => {
        if (modalOpen) closeModal();
      }}
      style={{ position: "relative" }}
    >
      {/* 상단 섹션 */}
      <div className="flex justify-between items-center mb-4">
        <div className="ml-16 text-lg font-bold text-gray-700">
          {format(currentWeek, "MMMM yyyy")}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={setPrevWeek}
            className="text-[#463198] text-xl p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
          >
            <FaChevronLeft />
          </button>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={format(currentWeek, "yyyy-MM-dd")}
              onChange={handleWeekChange}
              className="border border-gray-100 rounded-md px-2 py-1 text-sm"
            />
          </div>
          <button
            onClick={setNextWeek}
            className="text-[#463198] text-xl p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
          >
            <FaChevronRight />
          </button>
          {/* "지난 일정 포함" 체크박스 */}
          <label className="flex items-center space-x-1 cursor-pointer ml-4">
            {showPastSchedules ? (
              <FaCheckSquare
                className="text-blue-600"
                onClick={toggleShowPastSchedules}
              />
            ) : (
              <FaRegSquare
                className="text-gray-400"
                onClick={toggleShowPastSchedules}
              />
            )}
            <span
              className="text-sm text-gray-700"
              onClick={toggleShowPastSchedules}
            >
              지난 일정 포함
            </span>
          </label>
        </div>
      </div>

      {/* 요일 헤더 */}
      <WeekHeader startOfCurrentWeek={startOfCurrentWeek} />

      {/* 시간대와 셀 */}
      <div
        className="h-[1500px] overflow-y-auto scrollbar-hide relative"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "calc(100%)",
          boxSizing: "border-box",
        }}
      >
        {/* 시간대 표시 */}
        <div
          className="absolute left-0 top-0"
          style={{
            width: "102.4px",
            height: "100%",
            borderRight: "1px solid #e5e7eb",
          }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              style={{
                height: `${(1 / 24) * 100}%`,
                borderBottom: "1px solid #e5e7eb",
                boxSizing: "border-box",
                position: "relative",
              }}
            >
              {hour !== 0 && (
                <span
                  className="absolute left-0 top-0 text-xs text-gray-400"
                  style={{ transform: "translateY(-50%)" }}
                >
                  {format(new Date().setHours(hour, 0), "ha").toLowerCase()}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 날짜별 시간대 표시 */}
        <div
          className="absolute left-[102.4px] top-0"
          style={{ width: "calc(100% - 102.4px)", height: "100%" }}
        >
          {[...Array(7)].map((_, dayIndex) => (
            <div
              key={dayIndex}
              className="absolute top-0"
              style={{
                left: `calc(${(dayIndex * 100) / 7}%)`,
                width: `calc(100% / 7)`,
                height: "100%",
                borderRight: "1px solid #e5e7eb",
                boxSizing: "border-box",
              }}
            >
              {/* 각 시간대의 배경 그리드 */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{
                    height: `${(1 / 24) * 100}%`,
                    borderBottom: "1px solid #e5e7eb",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    className="h-full w-full group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const clickedMinutes = (y / rect.height) * 60;
                      const clickedHour = hour;
                      const clickedDate = new Date(startOfCurrentWeek);
                      clickedDate.setDate(clickedDate.getDate() + dayIndex);
                      clickedDate.setHours(
                        clickedHour,
                        Math.floor(clickedMinutes),
                        0,
                        0
                      );

                      handleTimeBlockClick(
                        dayIndex,
                        clickedHour,
                        Math.floor(clickedMinutes / 15),
                        e
                      );
                    }}
                    style={{
                      position: "relative",
                      height: "100%",
                    }}
                  >
                    {/* Hover 효과 복원 */}
                    <div
                      className="absolute inset-0 group-hover:bg-blue-100"
                      style={{
                        borderRadius: "0px",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* 등록된 일정 렌더링 */}
          {renderSchedules()}
        </div>
      </div>

      {/* 모달 컴포넌트 */}
      {modalOpen && (
        <ScheduleModal
          schedule={selectedSchedule}
          position={modalPosition}
          onClose={handleModalClose}
          isClosing={modalClosing}
        />
      )}

      {/* 스크롤 바 숨기기 */}
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
    </div>
  );
};

export default Calendar;
