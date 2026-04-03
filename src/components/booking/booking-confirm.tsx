"use client";

type BookingData = {
  serviceName: string; serviceDuration: number; providerName: string;
  date: string; startTime: string; endTime: string;
  customerName: string; customerPhone: string; notes: string;
};

export function BookingConfirm({ data, onConfirm, onBack, submitting }: {
  data: BookingData; onConfirm: () => void; onBack: () => void; submitting: boolean;
}) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">確認預約</h2>
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <div className="flex justify-between"><span className="text-gray-500">服務</span><span className="font-medium">{data.serviceName}（{data.serviceDuration} 分鐘）</span></div>
        <div className="flex justify-between"><span className="text-gray-500">提供者</span><span className="font-medium">{data.providerName}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">日期</span><span className="font-medium">{data.date}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">時間</span><span className="font-medium">{data.startTime} - {data.endTime}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">姓名</span><span className="font-medium">{data.customerName}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">電話</span><span className="font-medium">{data.customerPhone}</span></div>
        {data.notes && <div className="flex justify-between"><span className="text-gray-500">備註</span><span className="font-medium">{data.notes}</span></div>}
      </div>
      <div className="mt-4 space-y-2">
        <button onClick={onConfirm} disabled={submitting} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
          {submitting ? "預約中..." : "確認預約"}
        </button>
        <button onClick={onBack} className="w-full text-gray-500 py-2 hover:underline">← 返回修改</button>
      </div>
    </div>
  );
}
