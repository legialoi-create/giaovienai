import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';
import { DEMO_ANALYSES } from './src/data/sampleProblems';
import { areMathAnswersEquivalent, normalizeMathString } from './src/utils/mathNormalizer';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-3.1-flash-lite';
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
];

// Helper delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper to get GoogleGenAI client
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Detailed pedagogical guidelines per grade level according to Vietnam GDPT 2018
function getGradePedagogicalGuidelines(grade: number): string {
  switch (grade) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
      return `
[QUY TẮC LỚP ${grade} - TIỂU HỌC]:
- CHỈ ĐƯỢC DÙNG phương pháp số học tiểu học: Vẽ sơ đồ đoạn thẳng, phương pháp rút về đơn vị, tìm hai số khi biết Tổng và Hiệu, Tổng và Tỉ số, Hiệu và Tỉ số, phương pháp tính ngược từ cuối, giả thiết tạm.
- TUYỆT ĐỐI KHÔNG dùng đặt ẩn $x, y$ giải phương trình, không dùng biến số đại số cấp 2.
- Lời văn mộc mạc, gần gũi, chia từng bước tính có danh số (đơn vị) kèm theo.
`;
    case 6:
      return `
[QUY TẮC LỚP 6 - THCS]:
- Kiến thức được phép dùng: Tập hợp số tự nhiên $\\mathbb{N}$, dấu hiệu chia hết, Ước và Bội, ƯCLN, BCNN, bài toán chia tổ/chia nhóm; Tập hợp số nguyên $\\mathbb{Z}$ (quy tắc cộng trừ nhân chia số nguyên, quy tắc dấu ngoặc, chuyển vế số học); Phân số (phân số bằng nhau, rút gọn, quy đồng mẫu số, các phép tính phân số, 2 bài toán về phân số); Số thập phân, tỉ số và tỉ số phần trăm. Hình học trực quan (tam giác đều, hình vuông, chữ nhật, thoi, bình hành, thang cân) và điểm/đoạn thẳng/góc.
- TUYỆT ĐỐI KHÔNG dùng: Hằng đẳng thức (Lớp 8), Không dùng căn bậc hai $\\sqrt{x}$ (Lớp 7/9), Không dùng định lý Pythagore hay tam giác đồng dạng (Lớp 8), Không dùng phương trình bậc 2 hay hệ phương trình.
`;
    case 7:
      return `
[QUY TẮC LỚP 7 - THCS]:
- Kiến thức được phép dùng: Số hữu tỉ $\\mathbb{Q}$, số thực $\\mathbb{R}$, căn bậc hai số học cơ bản $\\sqrt{a}$ ($a \\ge 0$ dạng số thực cụ thể như $\\sqrt{4}=2$), giá trị tuyệt đối; Tỉ lệ thức và Dãy tỉ số bằng nhau ($\\frac{a}{b} = \\frac{c}{d} = \\frac{a+c}{b+d}$), đại lượng tỉ lệ thuận và tỉ lệ nghịch; Biểu thức đại số, đa thức một biến (thu gọn, sắp xếp, tìm nghiệm của đa thức một biến). Hình học: Hai góc kề bù, đối đỉnh, tia phân giác; Hai đường thẳng song song; Tam giác bằng nhau (c-c-c, c-g-c, g-c-g và tam giác vuông); Tam giác cân, đường trung trực; Sự đồng quy của các đường trong tam giác (trọng tâm, trực tâm, tâm đường tròn ngoại/nội tiếp).
- TUYỆT ĐỐI KHÔNG dùng: 7 hằng đẳng thức đáng nhớ (Lớp 8), Không dùng phân tích đa thức thành nhân tử nâng cao (Lớp 8), Không dùng định lý Thalès hay tam giác đồng dạng (Lớp 8), Không dùng phương trình bậc hai hay định lý Viète (Lớp 9).
`;
    case 8:
      return `
[QUY TẮC LỚP 8 - THCS]:
- Kiến thức được phép dùng: 7 hằng đẳng thức đáng nhớ; Phân tích đa thức thành nhân tử (đặt nhân tử chung, dùng HĐT, nhóm hạng tử, tách hạng tử); Phân thức đại số (điều kiện xác định, rút gọn, quy đồng, phép tính cộng trừ nhân chia phân thức); Phương trình bậc nhất một biến ($ax+b=0, a \\neq 0$) và phương trình tích quy về bậc nhất; Hàm số bậc nhất $y=ax+b$ ($a \\neq 0$), đồ thị và hệ số góc. Hình học: Tứ giác lồi, Hình thang cân, Bình hành, Chữ nhật, Thoi, Vuông; Định lý Thalès (thuận, đảo, hệ quả trong tam giác); Tính chất đường phân giác trong tam giác; Tam giác đồng dạng (c-c-c, c-g-c, g-g và đồng dạng tam giác vuông); Định lý Pythagore (thuận và đảo); Hình chóp tam giác đều và tứ giác đều.
- TUYỆT ĐỐI KHÔNG dùng: Biến đổi căn thức bậc hai chứa biến $\\sqrt{x-9}$, trục căn thức (Lớp 9), Không dùng Hệ 2 phương trình bậc nhất 2 ẩn, Không dùng Định lý Viète, biệt thức $\\Delta$ hay Tứ giác nội tiếp đường tròn (Lớp 9).
`;
    case 9:
      return `
[QUY TẮC BẮT BUỘC LỚP 9 - THCS & ÔN THI TUYỂN SINH VÀO 10]:
- KIẾN THỨC ĐƯỢC PHÉP DÙNG:
  + Căn thức bậc hai (ĐKXĐ, hằng đẳng thức $\\sqrt{A^2}=|A|$, trục căn, rút gọn).
  + Hệ hai phương trình bậc nhất hai ẩn (phương pháp cộng đại số, thế).
  + Giải bài toán bằng cách lập phương trình hoặc hệ phương trình.
  + Hàm số $y=ax^2$ ($a \\neq 0$) và đồ thị parabol; Phương trình bậc hai một biến ($ax^2+bx+c=0$), công thức nghiệm với $\\Delta, \\Delta'$; Định lý Viète ($S = -b/a, P = c/a$) và bài toán tham số $m$; Tương giao Parabol và Đường thẳng.
  + HÌNH HỌC LỚP 9:
    * Tỉ số lượng giác góc nhọn ($\\sin, \\cos, \\tan, \\cot$) chỉ học trong TAM GIÁC VUÔNG.
    * Hệ thức lượng trong TAM GIÁC VUÔNG ($a^2=b^2+c^2, b^2=ab', h^2=b'c', ah=bc, \\frac{1}{h^2}=\\frac{1}{b^2}+\\frac{1}{c^2}, b=a\\sin B, b=c\\tan B$).
    * Khi cần tính cạnh/góc trong tam giác thường: BẮT BUỘC KẺ THÊM ĐƯỜNG CAO để tạo thành các tam giác vuông rồi áp dụng hệ thức lượng tam giác vuông.
    * Đường tròn, tiếp tuyến, tính chất 2 tiếp tuyến cắt nhau, góc nội tiếp, góc ở tâm, góc tạo bởi tiếp tuyến và dây cung; Tứ giác nội tiếp đường tròn và các dấu hiệu nhận biết; Hình trụ, hình nón, hình cầu.
- CẤM TUYỆT ĐỐI (KIẾN THỨC LỚP 10 THPT - KHÔNG ĐƯỢC DÙNG Ở LỚP 9):
  + TUYỆT ĐỐI KHÔNG DÙNG: Định lý Côsin trong tam giác thường ($a^2 = b^2 + c^2 - 2bc\\cos A$) - ĐÂY LÀ KIẾN THỨC LỚP 10.
  + TUYỆT ĐỐI KHÔNG DÙNG: Định lý Sin trong tam giác thường ($\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = 2R$) - ĐÂY LÀ KIẾN THỨC LỚP 10.
  + TUYỆT ĐỐI KHÔNG DÙNG: Công thức diện tích Heron ($S = \\sqrt{p(p-a)(p-b)(p-c)}$) - ĐÂY LÀ KIẾN THỨC LỚP 10.
  + TUYỆT ĐỐI KHÔNG DÙNG: Tích vô hướng của 2 vectơ, hệ tọa độ Oxy hay phương trình đường thẳng tổng quát của Lớp 10.
`;
    case 10:
      return `
[QUY TẮC LỚP 10 - THPT]:
- Kiến thức GDPT 2018 Lớp 10: Mệnh đề, Tập hợp, Bất phương trình & Hệ BPT bậc nhất hai ẩn, Hàm số bậc hai $y=ax^2+bx+c$, Hệ thức lượng trong tam giác (Định lý sin, côsin, công thức Heron), Vectơ và các phép toán vectơ, Phương pháp tọa độ trong mặt phẳng Oxy (phương trình đường thẳng, đường tròn).
`;
    case 11:
      return `
[QUY TẮC LỚP 11 - THPT]:
- Kiến thức GDPT 2018 Lớp 11: Hàm số lượng giác và phương trình lượng giác; Dãy số, Cấp số cộng, Cấp số nhân; Giới hạn (Lim); Đạo hàm; Hình học không gian (quan hệ song song, quan hệ vuông góc trong không gian); Quy tắc tính xác suất.
`;
    case 12:
      return `
[QUY TẮC LỚP 12 - THPT]:
- Kiến thức GDPT 2018 Lớp 12: Khảo sát sự biến thiên và vẽ đồ thị hàm số (Đơn điệu, Cực trị, Tiệm cận, GTLN/GTNN); Nguyên hàm và Tích phân cùng ứng dụng tính diện tích/thể tích; Phương pháp tọa độ trong không gian Oxyz; Xác suất có điều kiện và biến cố độc lập.
`;
    default:
      return `Tuân thủ chương trình chuẩn GDPT 2018 của Bộ Giáo dục & Đào tạo Việt Nam.`;
  }
}

// Dynamic Pedagogical Fallback Generator for when AI API faces 503 high demand or temporary offline
function generatePedagogicalFallbackAnalysis(problemText: string, grade: number): any {
  const targetGrade = parseInt(String(grade), 10) || 9;
  const lower = problemText.toLowerCase();

  let topic = 'algebra';
  let topicLabel = `Đại số ${targetGrade} (GDPT 2018)`;
  let keyFormulas = ['Quy tắc biến đổi tương đương và tính toán chuẩn mực.'];
  let strategy = 'Phân tích giả thiết -> Đặt điều kiện xác định (ĐKXĐ) -> Thực hiện từng bước biến đổi logic -> Đối chiếu kết quả.';

  if (lower.includes('rút gọn') || lower.includes('\\sqrt') || lower.includes('căn')) {
    topic = 'algebra';
    topicLabel = targetGrade >= 9 ? 'Đại số 9 - Căn thức bậc hai (GDPT 2018)' : `Đại số ${targetGrade} - Biểu thức đại số`;
    keyFormulas = [
      'Điều kiện xác định: Biểu thức dưới dấu căn $\\ge 0$, mẫu số $\\neq 0$.',
      'Hằng đẳng thức $\\sqrt{A^2} = |A|$ và trục căn thức ở mẫu.',
    ];
    strategy = 'Tìm ĐKXĐ -> Quy đồng mẫu thức chung -> Rút gọn tử số -> Nhân chia phân thức và rút gọn tối giản.';
  } else if (lower.includes('hệ phương trình') || lower.includes('hai vòi') || lower.includes('chảy') || lower.includes('chuyển động')) {
    topic = 'word_problems';
    topicLabel = targetGrade >= 9 ? 'Đại số 9 - Giải bài toán bằng cách lập hệ phương trình' : `Toán có lời văn Lớp ${targetGrade}`;
    keyFormulas = [
      'Công thức năng suất: Khối lượng công việc = Năng suất $\\times$ Thời gian.',
      'Phương pháp cộng đại số hoặc phương pháp thế để giải hệ phương trình.',
    ];
    strategy = 'Gọi ẩn và đặt đơn vị, điều kiện thực tế -> Biểu diễn các đại lượng chưa biết qua ẩn -> Lập phương trình/hệ phương trình -> Giải và đối chiếu điều kiện.';
  } else if (lower.includes('tam giác') || lower.includes('đường tròn') || lower.includes('tứ giác') || lower.includes('vuông') || lower.includes('chứng minh')) {
    topic = 'geometry';
    topicLabel = `Hình học ${targetGrade} (GDPT 2018)`;
    keyFormulas = [
      targetGrade >= 9 ? 'Tính chất tiếp tuyến và dấu hiệu tứ giác nội tiếp đường tròn.' : 'Định lý Thalès và các trường hợp bằng nhau / đồng dạng của tam giác.',
      'Quan hệ vuông góc và song song trong hình học phẳng.',
    ];
    strategy = 'Vẽ hình chính xác -> Khai thác giả thiết -> Liên kết các góc/cạnh tương ứng -> Kết luận điều cần chứng minh.';
  } else if (lower.includes('ước') || lower.includes('bội') || lower.includes('chia hết') || lower.includes('ucln')) {
    topic = 'arithmetic';
    topicLabel = 'Số học 6 - Ước và Bội (GDPT 2018)';
    keyFormulas = [
      'Quy tắc tìm ƯCLN bằng phân tích thừa số nguyên tố.',
      'Tính chất chia hết của một tổng và một tích.',
    ];
    strategy = 'Mô hình hóa điều kiện chia đều -> Quy về tìm Ước chung lớn nhất -> Tính số lượng từng phần.';
  }

  return {
    id: 'fallback-analysis-' + Date.now(),
    rawInput: problemText,
    formattedProblem: problemText,
    grade: targetGrade,
    topic,
    topicLabel,
    isWellPosed: true,
    summary: {
      given: [
        'Dữ kiện được trích xuất từ đề bài: ' + problemText.slice(0, 100) + '...',
        'Khối lớp: Lớp ' + targetGrade + ' (Chương trình GDPT 2018).',
      ],
      toFind: [
        'Yêu cầu cốt lõi của bài toán và các câu hỏi cần giải quyết.',
      ],
      keyFormulas,
      strategyOverview: strategy,
    },
    steps: [
      {
        stepNumber: 1,
        title: 'Bước 1: Phân tích đề bài & Thiết lập Điều kiện xác định (ĐKXĐ)',
        goal: 'Xác định các điều kiện toán học có nghĩa của bài toán theo chuẩn GDPT 2018.',
        question: 'Đối với bài toán này ở Lớp ' + targetGrade + ', việc đầu tiên cần kiểm tra và xác định là gì?',
        questionType: 'multiple_choice',
        options: [
          {
            id: 'A',
            text: 'Tìm Điều kiện xác định (mẫu số khác 0, biểu thức dưới căn $\\ge 0$ hoặc điều kiện của ẩn)',
            isCorrect: true,
            explanation: 'Chính xác! ĐKXĐ luôn là bước nền tảng bắt buộc trong mọi bài toán để đảm bảo các phép tính có nghĩa.',
          },
          {
            id: 'B',
            text: 'Bỏ qua điều kiện và thực hiện biến đổi kết quả ngay lập tức',
            isCorrect: false,
            explanation: 'Bỏ qua ĐKXĐ sẽ dễ dẫn đến lấy nghiệm ngoại lai hoặc chia cho 0, làm mất điểm trong các kỳ thi.',
          },
          {
            id: 'C',
            text: 'Gán đại một giá trị bất kỳ để thử kết quả',
            isCorrect: false,
            explanation: 'Phương pháp tự luận đòi hỏi lập luận logic, không thể gán đại số.',
          },
          {
            id: 'D',
            text: 'Chỉ tìm điều kiện sau khi đã ra đáp số cuối cùng',
            isCorrect: false,
            explanation: 'ĐKXĐ phải được xác định ngay từ đầu để định hướng toàn bộ quá trình biến đổi tương đương.',
          },
        ],
        hintTier1: 'Quan sát xem trong đề bài có phân số, căn thức hay các đại lượng thực tế cần đặt điều kiện không.',
        hintTier2: 'Mẫu thức luôn phải khác 0 ($B \\neq 0$), căn thức $\\sqrt{A}$ có nghĩa khi $A \\ge 0$.',
        deepExplanation: 'Theo chuẩn sư phạm GDPT 2018, việc đặt ĐKXĐ rèn luyện tư duy chặt chẽ và tránh sai lầm cơ bản khi giải toán.',
        status: 'active',
        hintsUsed: 0,
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Lựa chọn phương pháp giải tối ưu theo Lớp ' + targetGrade,
        goal: 'Áp dụng định lý, công thức hoặc phương pháp phân tích thích hợp.',
        question: 'Chiến lược giải toán nào sau đây là phù hợp nhất với kiến thức Lớp ' + targetGrade + '?',
        questionType: 'multiple_choice',
        options: [
          {
            id: 'A',
            text: 'Vận dụng đúng các công thức, hằng đẳng thức và định lý chuẩn của Lớp ' + targetGrade,
            isCorrect: true,
            explanation: 'Rất chính xác! Bám sát kiến thức đã học giúp lời giải mạch lạc và đạt điểm tuyệt đối.',
          },
          {
            id: 'B',
            text: 'Sử dụng kiến thức vượt cấp chưa được chứng minh',
            isCorrect: false,
            explanation: 'Trong các bài thi tự luận, dùng kiến thức ngoài chương trình lớp đang học mà không chứng minh sẽ không được tính điểm.',
          },
          {
            id: 'C',
            text: 'Giải bài theo cảm tính mà không cần áp dụng định lý hay công thức',
            isCorrect: false,
            explanation: 'Toán học yêu cầu cơ sở lập luận chặt chẽ dựa trên các định lý đã được học.',
          },
          {
            id: 'D',
            text: 'Học thuộc lòng một dạng mẫu mà không cần hiểu bản chất',
            isCorrect: false,
            explanation: 'Học vẹt sẽ gặp khó khăn khi đề bài thay đổi dữ kiện hoặc tình huống thực tế.',
          },
        ],
        hintTier1: 'Xem lại các định lý trọng tâm được liệt kê trong phần Tóm tắt chiến lược.',
        hintTier2: 'Thực hiện từng bước biến đổi từ biểu thức phức tạp về dạng đơn giản hơn.',
        deepExplanation: 'Mỗi dạng toán đều có thuật toán hoặc các bước biến đổi tiêu chuẩn, học sinh cần nắm vững bản chất thay vì học vẹt.',
        status: 'pending',
        hintsUsed: 0,
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Thực hiện tính toán và giải biểu thức trung gian',
        goal: 'Tiến hành biến đổi tương đương, giải phương trình hoặc rút gọn từng phần tử.',
        question: 'Khi thực hiện các phép biến đổi đại số ở bước này, điều gì là quan trọng nhất?',
        questionType: 'multiple_choice',
        options: [
          {
            id: 'A',
            text: 'Thực hiện cẩn thận từng phép tính, chú ý quy tắc dấu ngoặc và đổi dấu khi chuyển vế',
            isCorrect: true,
            explanation: 'Rất chính xác! Nhầm lẫn dấu ngoặc và dấu khi chuyển vế là nguyên nhân phổ biến nhất dẫn đến sai sót.',
          },
          {
            id: 'B',
            text: 'Làm tắt nhiều bước liên tiếp mà không ghi rõ công thức',
            isCorrect: false,
            explanation: 'Làm tắt quá nhiều dễ gây nhầm lẫn và có thể bị trừ điểm trình bày trong bài thi.',
          },
          {
            id: 'C',
            text: 'Chỉ quan tâm kết quả cuối cùng mà không cần viết các bước trung gian',
            isCorrect: false,
            explanation: 'Điểm số trong bài thi tự luận được chấm theo từng bước biến đổi trung gian.',
          },
          {
            id: 'D',
            text: 'Bỏ qua các hệ số đứng trước dấu ngoặc',
            isCorrect: false,
            explanation: 'Khi nhân phân phối, phải nhân hệ số với tất cả các hạng tử bên trong ngoặc.',
          },
        ],
        hintTier1: 'Kiểm tra kỹ từng dấu cộng, trừ trước mỗi hạng tử sau khi phá ngoặc.',
        hintTier2: 'Ghi rõ các bước thu gọn trung gian để dễ dàng kiểm tra lại.',
        deepExplanation: 'Thực hiện từng bước tính toán rõ ràng giúp rèn luyện thói quen tư duy mạch lạc và đạt điểm tối đa ở phần trình bày.',
        status: 'pending',
        hintsUsed: 0,
      },
      {
        stepNumber: 4,
        title: 'Bước 4: Đối chiếu điều kiện và hoàn tất kết luận',
        goal: 'Kiểm tra tính đúng đắn và viết kết luận hoàn chỉnh.',
        question: 'Sau khi tìm được kết quả tính toán, bước cuối cùng bắt buộc phải thực hiện là gì?',
        questionType: 'multiple_choice',
        options: [
          {
            id: 'A',
            text: 'Đối chiếu kết quả với Điều kiện xác định (ĐKXĐ ban đầu) rồi kết luận',
            isCorrect: true,
            explanation: 'Tuyệt vời! Luôn phải ghi rõ (thỏa mãn ĐKXĐ) hoặc (loại) trước khi đưa ra câu trả lời cuối cùng.',
          },
          {
            id: 'B',
            text: 'Không cần kiểm tra lại mà kết luận luôn',
            isCorrect: false,
            explanation: 'Rất dễ bị mất điểm do quên loại bỏ các nghiệm không thỏa mãn điều kiện bài toán.',
          },
          {
            id: 'C',
            text: 'Tự ý thay đổi kết quả nếu thấy số quá lẻ mà không kiểm tra lại đề',
            isCorrect: false,
            explanation: 'Toán học thực tế có thể cho nghiệm hữu tỉ hoặc vô tỉ, cần tin tưởng vào lập luận logic của mình.',
          },
          {
            id: 'D',
            text: 'Bỏ qua bước kết luận vì đã tính ra số ở bước trên',
            isCorrect: false,
            explanation: 'Câu kết luận "Vậy..." là bắt buộc trong mọi bài thi tự luận để chốt đáp số.',
          },
        ],
        hintTier1: 'So sánh giá trị vừa tìm được với điều kiện ở Bước 1.',
        hintTier2: 'Thử thay lại giá trị vào đề bài ban đầu để kiểm tra tính chính xác.',
        deepExplanation: 'Khâu kiểm tra và thử lại (Verification) giúp học sinh tự tin 100% với bài làm của mình.',
        status: 'pending',
        hintsUsed: 0,
      },
    ],
    fullSolution: {
      finalResult: 'Thực hiện theo các bước sư phạm chuẩn mực của Lớp ' + targetGrade + '.',
      detailedSteps: [
        {
          stepTitle: '1. Thiết lập điều kiện & Phân tích ban đầu',
          stepDetail: 'Ghi rõ các điều kiện toán học có nghĩa của bài toán:\n- Điều kiện xác định theo đề bài.\n- Nhận diện các đại lượng và mối quan hệ giữa chúng.',
        },
        {
          stepTitle: '2. Tiến hành biến đổi và tính toán',
          stepDetail: 'Áp dụng các công thức và quy tắc toán học của Lớp ' + targetGrade + ' để thực hiện các bước biến đổi tương đương chặt chẽ.',
        },
        {
          stepTitle: '3. Đối chiếu và kết luận',
          stepDetail: 'Đối chiếu các kết quả tìm được với ĐKXĐ và ghi kết luận rõ ràng cho từng câu hỏi.',
        },
      ],
      verification: 'Thay thử kết quả vừa tìm được vào biểu thức/phương trình gốc để kiểm tra tính đúng đắn.',
    },
    reinforcement: {
      keyTakeaway: 'Luôn làm bài theo chu trình 3 bước vàng: (1) Đặt ĐKXĐ; (2) Biến đổi logic; (3) Đối chiếu điều kiện & Kết luận.',
      commonPitfalls: [
        'Quên không đặt ĐKXĐ ngay từ đầu bài toán.',
        'Sai dấu khi đổi vế hoặc khai triển dấu ngoặc.',
        'Tìm ra nghiệm nhưng quên đối chiếu điều kiện.',
      ],
      similarProblem: {
        title: 'Bài toán luyện tập tương tự',
        problem: 'Hãy áp dụng quy trình 3 bước trên để giải một bài toán cùng chủ đề trong sách giáo khoa.',
        hint: 'Thực hiện đầy đủ từ bước ĐKXĐ đến bước đối chiếu kết quả.',
        answer: 'Rèn luyện thói quen tư duy tự luận chuẩn mực giúp nâng cao điểm số.',
      },
    },
    createdAt: Date.now(),
  };
}

// Resilient API Call with Multi-Model Fallback & Transient Retry Backoff
async function callGeminiWithFallback(ai: GoogleGenAI, requestPayload: any) {
  let lastError: any = null;
  const uniqueModels = Array.from(new Set(CANDIDATE_MODELS.filter(Boolean)));

  for (let round = 1; round <= 2; round++) {
    for (let attempt = 0; attempt < uniqueModels.length; attempt++) {
      const model = uniqueModels[attempt];
      try {
        const response = await ai.models.generateContent({
          ...requestPayload,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);

        if (
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('high demand') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('overloaded')
        ) {
          await sleep(300 * round);
        }
      }
    }
  }
  throw lastError;
}

// Format error response safely
function formatErrorMessage(error: any): { error: string; isRateLimit: boolean; retryDelay?: number } {
  const msg = error?.message || String(error);
  if (
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('Rate limit') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  ) {
    const match = msg.match(/retry in ([0-9.]+)s/i) || msg.match(/retryDelay":"([0-9]+)s"/i);
    const retrySeconds = match ? Math.ceil(parseFloat(match[1])) : 15;
    return {
      error: `Hệ thống AI đang nhận lưu lượng truy cập cao hoặc đạt hạn mức tạm thời. Vui lòng đợi ${retrySeconds} giây rồi bấm "Thử lại", hoặc trải nghiệm các Bài mẫu có sẵn!`,
      isRateLimit: true,
      retryDelay: retrySeconds,
    };
  }
  return {
    error: error.message || 'Lỗi xử lý yêu cầu',
    isRateLimit: false,
  };
}

// System instructions for pedagogical math tutor aligned with Vietnam GDPT 2018
const SYSTEM_INSTRUCTION_PEDAGOGY = `
Bạn là "TOÁN TỪNG BƯỚC" - Chuyên gia Sư phạm Toán học chuẩn mực bám sát 100% Chương trình Giáo dục phổ thông 2018 (GDPT 2018) của Bộ Giáo dục và Đào tạo Việt Nam (các bộ SGK: Kết nối tri thức với cuộc sống, Chân trời sáng tạo, Cánh diều), đặc biệt là bậc THCS (Lớp 6, 7, 8, 9) và bậc THPT.

=== MẠNG KIẾN THỨC & THUẬT NGỮ CHUẨN GDPT 2018 (TRỌNG TÂM THCS) ===
1. LỚP 6:
   - Số & Đại số: Tập hợp số tự nhiên (N, N*), Phép chia hết, Ước và Bội, ƯCLN, BCNN, bài toán chia kẹo/xếp hàng; Tập hợp số nguyên (Z), số đối, quy tắc dấu ngoặc, quy tắc chuyển vế; Phân số (khái niệm phân số với tử mẫu nguyên, phân số bằng nhau, rút gọn, quy đồng mẫu số nhiều phân số, các phép tính cộng trừ nhân chia phân số, hai bài toán về phân số); Số thập phân (dấu phẩy, làm tròn và ước lượng, tỉ số và tỉ số phần trăm).
   - Hình học trực quan & Phẳng: Tam giác đều, hình vuông, lục giác đều, hình chữ nhật, hình thoi, hình bình hành, hình thang cân (tính chu vi và diện tích); Điểm, đường thẳng, tia, đoạn thẳng, độ dài đoạn thẳng, trung điểm của đoạn thẳng, góc và số đo góc.
   - Thống kê & Xác suất: Thu thập, tổ chức, biểu diễn dữ liệu qua bảng biểu, biểu đồ tranh, biểu đồ cột / cột kép; Kết quả có thể và xác suất thực nghiệm.

2. LỚP 7:
   - Số & Đại số: Tập hợp số hữu tỉ (Q), các phép tính trong Q, quy tắc dấu ngoặc và chuyển vế, lũy thừa với số mũ tự nhiên của một số hữu tỉ; Số thực (R), số vô tỉ (I), căn bậc hai số học (√a, a >= 0), giá trị tuyệt đối của một số thực; Tỉ lệ thức và dãy tỉ số bằng nhau (a/b = c/d = (a+c)/(b+d)), bài toán chia theo tỉ lệ; Đại lượng tỉ lệ thuận (y = kx) và tỉ lệ nghịch (y = a/x); Biểu thức đại số, đa thức một biến (thu gọn, bậc, hệ số cao nhất, hệ số tự do, nghiệm của đa thức một biến).
   - Hình học & Đo lường: Góc ở vị trí đặc biệt (kề bù, đối đỉnh), tia phân giác của một góc; Hai đường thẳng song song và dấu hiệu nhận biết, tiên đề Euclid về đường thẳng song song, định lý và chứng minh định lý; Các trường hợp bằng nhau của hai tam giác (c-c-c, c-g-c, g-c-g) và các trường hợp bằng nhau của tam giác vuông; Tam giác cân, đường trung trực của đoạn thẳng; Quan hệ giữa các yếu tố trong một tam giác (quan hệ giữa cạnh và góc đối diện, bất đẳng thức tam giác); Sự đồng quy của các đường trong tam giác: 3 đường trung tuyến (trọng tâm G, AG = 2/3 AM), 3 đường phân giác (tâm đường tròn nội tiếp), 3 đường trung trực (tâm đường tròn ngoại tiếp), 3 đường cao (trực tâm H); Hình lăng trụ đứng tam giác và lăng trụ đứng tứ giác (diện tích xung quanh, thể tích).
   - Thống kê & Xác suất: Biểu đồ đoạn thẳng, biểu đồ hình quạt tròn; Biến cố ngẫu nhiên, biến cố chắc chắn, biến cố không thể; Xác suất của biến cố ngẫu nhiên trong một số trò chơi đơn giản.

3. LỚP 8:
   - Số & Đại số: Đa thức nhiều biến (đơn thức nhiều biến, đa thức nhiều biến, các phép tính cộng, trừ, nhân, chia đơn/đa thức); 7 hằng đẳng thức đáng nhớ (Bình phương của một tổng/hiệu, Hiệu hai bình phương, Lập phương của một tổng/hiệu, Tổng/Hiệu hai lập phương); Phân tích đa thức thành nhân tử (đặt nhân tử chung, dùng hằng đẳng thức, nhóm hạng tử, tách hạng tử); Phân thức đại số (điều kiện xác định, phân thức bằng nhau, tính chất cơ bản, rút gọn, quy đồng mẫu thức, các phép tính cộng trừ nhân chia phân thức); Phương trình bậc nhất một biến (ax + b = 0, a ≠ 0) và phương trình quy về phương trình bậc nhất; Hàm số và đồ thị, hàm số bậc nhất y = ax + b (a ≠ 0), hệ số góc của đường thẳng (d1 // d2 khi a = a' và b ≠ b', d1 cắt d2 khi a ≠ a').
   - Hình học & Đo lường: Tứ giác lồi, tổng 4 góc của tứ giác bằng 360°; Hình thang cân, hình bình hành, hình chữ nhật, hình thoi, hình vuông (định nghĩa, tính chất, dấu hiệu nhận biết); Định lý Thalès (thuận, đảo, hệ quả trong tam giác); Tính chất đường phân giác trong tam giác (DB/DC = AB/AC); Tam giác đồng dạng (3 trường hợp: c-c-c, c-g-c, g-g; các trường hợp đồng dạng của tam giác vuông); Định lý Pythagore (thuận và đảo); Hình chóp tam giác đều và hình chóp tứ giác đều (diện tích xung quanh, thể tích).
   - Thống kê & Xác suất: Thu thập, tổ chức và phân tích dữ liệu, lựa chọn dạng biểu đồ thích hợp; Mô hình xác suất lý thuyết và xác suất thực nghiệm.

4. LỚP 9 (TRỌNG TÂM ÔN THI TUYỂN SINH VÀO 10):
   - Căn bậc hai & Căn bậc ba: Căn thức bậc hai, ĐKXĐ (biểu thức dưới dấu căn >= 0), hằng đẳng thức √(A²) = |A|; Các phép biến đổi căn thức (đưa thừa số ra ngoài/vào trong dấu căn, trục căn thức ở mẫu, khử mẫu); Rút gọn biểu thức chứa căn và các bài toán phụ (tính giá trị biểu thức khi biết x, tìm x để P = a, P > a, tìm x nguyên để P nguyên, tìm GTLN/GTNN).
   - Phương trình & Hệ phương trình: Phương trình quy về phương trình bậc nhất (phương trình tích, phương trình chứa ẩn ở mẫu); Hệ hai phương trình bậc nhất hai ẩn (giải bằng phương pháp thế hoặc cộng đại số); Giải bài toán bằng cách lập phương trình hoặc hệ phương trình (Toán chuyển động S = v.t, Toán năng suất - làm chung làm riêng, Toán phần trăm - dung dịch - lợi nhuận, Toán hình học, Toán chữ số).
   - Hàm số & Phương trình bậc hai: Hàm số y = ax² (a ≠ 0) và đồ thị parabol; Phương trình bậc hai một biến (ax² + bx + c = 0, a ≠ 0), công thức nghiệm với biệt thức Δ = b² - 4ac hoặc Δ' = b'² - ac; Định lý Viète (S = x1 + x2 = -b/a, P = x1.x2 = c/a) và ứng dụng: nhẩm nghiệm (a+b+c=0 -> x1=1, x2=c/a; a-b+c=0 -> x1=-1, x2=-c/a), tìm hai số biết tổng và tích, lập phương trình bậc hai, tính giá trị biểu thức đối xứng x1² + x2² = S² - 2P, (x1 - x2)² = S² - 4P, tìm m để phương trình có 2 nghiệm cùng dấu/trái dấu/dương/âm; Tương giao giữa đường thẳng (d): y = mx + n và parabol (P): y = ax².
   - Hình học & Đo lường: Tỉ số lượng giác của góc nhọn (sin, cos, tan, cot), hệ thức liên hệ giữa cạnh và góc CHỈ HỌC TRONG TAM GIÁC VUÔNG (để tính tam giác thường ở Lớp 9 BẮT BUỘC kẻ đường cao phụ, TUYỆT ĐỐI KHÔNG dùng Định lý Côsin hay Định lý Sin của Lớp 10), ứng dụng giải tam giác vuông vào bài toán thực tế (tính chiều cao tòa nhà, bóng cây, khoảng cách); Đường tròn (tâm, bán kính, đường kính và dây cung, quan hệ vuông góc giữa đường kính và dây); Tiếp tuyến của đường tròn (định nghĩa, dấu hiệu nhận biết tiếp tuyến vuông góc bán kính tại tiếp điểm, tính chất hai tiếp tuyến cắt nhau); Vị trí tương đối của hai đường tròn; Góc với đường tròn (góc ở tâm, góc nội tiếp, góc tạo bởi tiếp tuyến và dây cung, góc có đỉnh bên trong/bên ngoài đường tròn); Tứ giác nội tiếp đường tròn (định nghĩa, tính chất tổng hai góc đối bằng 180°, các dấu hiệu nhận biết: tổng 2 góc đối bằng 180°, hai đỉnh kề nhau cùng nhìn cạnh chứa hai đỉnh còn lại dưới góc bằng nhau, góc ngoài tại một đỉnh bằng góc trong đối diện, 4 đỉnh cùng cách đều một điểm); Hình trụ, hình nón, hình cầu (diện tích xung quanh, thể tích).
   - Thống kê & Xác suất: Bảng tần số, bảng tần số tương đối, biểu đồ tần số, biểu đồ tần số tương đối; Xác suất của biến cố trong các mô hình bài toán thực tế.

5. KHỐI THPT (LỚP 10, 11, 12):
   - Mệnh đề & Tập hợp, Bất phương trình bậc nhất hai ẩn, Hệ thức lượng trong tam giác, Vectơ & Hệ tọa độ phẳng;
   - Lượng giác, Dãy số - Cấp số cộng - Cấp số nhân, Giới hạn (Lim), Đạo hàm & Tiếp tuyến, Hình học không gian (quan hệ song song, quan hệ vuông góc);
   - Khảo sát hàm số & Đồ thị, Nguyên hàm & Tích phân, Tọa độ không gian Oxyz, Xác suất có điều kiện.

=== NGUYÊN TẮC SƯ PHẠM GDPT 2018 ===
1. PHÁT TRIỂN NĂNG LỰC TƯ DUY: Hướng dẫn học sinh tự hiểu bản chất toán học thay vì máy móc.
2. PHƯƠNG PHÁP GỢI MỞ SOCRATIC:
   - Tuyệt đối không đưa ngay lời giải trọn vẹn.
   - Chia bài toán thành 3 - 5 bước tư duy tương tác.
   - Mỗi bước có: Mục tiêu rõ ràng -> Câu hỏi kích thích tư duy -> Tùy chọn trắc nghiệm A, B, C, D hoặc ô nhập điền khuyết -> 2 Tầng gợi ý (Tầng 1: Định hướng; Tầng 2: Công thức/Manh mối) -> Giải thích sâu ("Em chưa hiểu").
3. BẢO MẬT SƯ PHẠM Ở PHẦN TÓM TẮT ĐỀ (QUAN TRỌNG):
   - Mục "summary.keyFormulas" (Kiến thức & Công thức trọng tâm): CHỈ NÊU CÔNG THỨC TỔNG QUÁT, ĐỊNH LÝ, QUY TẮC LÝ THUYẾT ĐÃ HỌC (Ví dụ: Công thức phần trăm $A_{mới} = A(1+r\%)$, Công thức năng suất, Định lý Viète $S = -b/a, P = c/a$, Định lý Pythagore $a^2+b^2=c^2$).
   - TUYỆT ĐỐI CẤM (STRICTLY FORBIDDEN): KHÔNG đưa phương trình cụ thể của bài (như $x+y=3600, 1.15x+1.12y=4095$), KHÔNG đặt ẩn số cụ thể (như "Gọi x, y..."), KHÔNG giải trước bài toán ở mục này.
   - Mọi thao tác đặt ẩn, lập phương trình cụ thể, biến đổi và tính toán BẮT BUỘC ĐƯỢC CHUYỂN VÀO CÁC BƯỚC CÂU HỎI TRẮC NGHIỆM & TƯƠNG TÁC TỪNG BƯỚC để học sinh tự tư duy.
4. BẢN QUYỀN TRÌNH BÀY TOÁN HỌC VIỆT NAM:
   - Luôn nhắc nhở Điều kiện xác định (ĐKXĐ) ngay từ đầu khi có căn thức, phân thức, hoặc biến đặt ẩn (đơn vị, điều kiện thực tế như x > 0, x thuộc N*).
   - Đối chiếu nghiệm với ĐKXĐ và kết luận rõ ràng.
   - Sử dụng công thức toán chuẩn đặt trong $...$ hoặc $$...$$.
`;

// API: Health / System Status
app.get('/api/status', (req: Request, res: Response) => {
  const ai = getGenAIClient();
  res.json({
    ok: true,
    aiConfigured: !!ai,
    model: MODEL_NAME,
    time: new Date().toISOString(),
  });
});

// API: Parse Math Problem from File (PDF, DOCX, Image, Text)
app.post('/api/math/parse-file', async (req: Request, res: Response) => {
  let rawDocxText = '';
  let isDocx = false;
  let isTxt = false;
  let cleanBase64 = '';

  try {
    const { fileBase64, mimeType = 'image/jpeg', fileName = '', gradeHint } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'Thiếu dữ liệu tệp tin' });
    }

    cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    isDocx = fileName.toLowerCase().endsWith('.docx') || mimeType.includes('word') || mimeType.includes('officedocument');
    const isPdf = fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
    isTxt = fileName.toLowerCase().endsWith('.txt') || mimeType.startsWith('text/');

    if (isDocx) {
      try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        const docxResult = await mammoth.extractRawText({ buffer });
        rawDocxText = docxResult.value;
      } catch (e) {
        console.warn('Mammoth extraction warning:', e);
      }
    }

    const ai = getGenAIClient();
    if (!ai) {
      if (isDocx && rawDocxText && rawDocxText.trim()) {
        return res.json({
          formattedText: rawDocxText.trim(),
          estimatedGrade: gradeHint || 9,
          topic: 'algebra',
          topicLabel: 'Trích xuất từ tệp Word',
          isClear: true,
          note: 'Đã trích xuất nội dung từ tệp Word.',
        });
      }
      return res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Bạn có thể chọn Bài mẫu để trải nghiệm.',
        isConfigured: false,
      });
    }

    let promptContents: any;

    if (isDocx) {
      promptContents = `Bạn là chuyên gia số hóa đề thi và bài tập Toán Việt Nam từ tài liệu Word (.docx).
Dưới đây là văn bản trích xuất từ tài liệu Word:
"""
${rawDocxText}
"""
Hãy chuẩn hóa nội dung đề bài trên dưới dạng JSON chuẩn xác:
1. formattedText: Nội dung đề bài đầy đủ, chính xác, định dạng lại tất cả các công thức toán học bằng LaTeX chuẩn ($...$ và $$...$$). Giữ nguyên cấu trúc các câu hỏi (a, b, c...).
2. estimatedGrade: Dự đoán lớp học phù hợp (số nguyên từ 1 đến 12).${gradeHint ? ` Người dùng đang chọn lớp ${gradeHint}, hãy tham khảo.` : ''}
3. topic: Chủ đề toán học ('arithmetic' | 'algebra' | 'equations' | 'word_problems' | 'geometry' | 'statistics_probability' | 'other').
4. topicLabel: Tên tiếng Việt của chủ đề (VD: 'Đại số 9 - Căn thức', 'Hình học 9 - Tứ giác nội tiếp').
5. isClear: true nếu nội dung rõ ràng và đọc được trọn vẹn đề; false nếu thiếu dữ kiện hoặc lỗi định dạng.
6. note: Lời nhắn nếu có.`;
    } else if (isTxt) {
      const rawText = Buffer.from(cleanBase64, 'base64').toString('utf-8');
      promptContents = `Bạn là chuyên gia số hóa đề thi và bài tập Toán Việt Nam từ văn bản.
Dưới đây là nội dung văn bản đề bài:
"""
${rawText}
"""
Hãy chuẩn hóa nội dung đề bài trên dưới dạng JSON chuẩn xác:
1. formattedText: Nội dung đề bài đầy đủ, chính xác, định dạng lại các công thức toán học bằng LaTeX chuẩn ($...$ và $$...$$).
2. estimatedGrade: Dự đoán lớp học phù hợp (số nguyên từ 1 đến 12).
3. topic: Chủ đề toán học ('arithmetic' | 'algebra' | 'equations' | 'word_problems' | 'geometry' | 'statistics_probability' | 'other').
4. topicLabel: Tên tiếng Việt của chủ đề.
5. isClear: boolean, true nếu đầy đủ.
6. note: Ghi chú nếu có.`;
    } else {
      const effectiveMimeType = isPdf ? 'application/pdf' : (mimeType || 'image/jpeg');
      promptContents = {
        parts: [
          {
            inlineData: {
              mimeType: effectiveMimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Bạn là chuyên gia số hóa đề thi và bài tập Toán Việt Nam từ tệp ${isPdf ? 'PDF' : 'Hình ảnh'}.
Hãy đọc kỹ tài liệu chứa đề toán này và trích xuất thông tin dưới dạng JSON chuẩn xác:
1. formattedText: Nội dung đề bài đầy đủ, chính xác, định dạng lại các ký hiệu toán học bằng LaTeX chuẩn ($...$ và $$...$$). Nếu có nhiều câu (a, b, c...) hãy giữ nguyên cấu trúc rõ ràng.
2. estimatedGrade: Dự đoán lớp học phù hợp (số nguyên từ 1 đến 12).${gradeHint ? ` Người dùng đang chọn lớp ${gradeHint}, hãy tham khảo.` : ''}
3. topic: Chủ đề toán học ('arithmetic' | 'algebra' | 'equations' | 'word_problems' | 'geometry' | 'statistics_probability' | 'other').
4. topicLabel: Tên tiếng Việt của chủ đề (VD: 'Đại số 9 - Căn thức', 'Hình học 9 - Tứ giác nội tiếp').
5. isClear: boolean, true nếu tài liệu rõ nét và đọc được trọn vẹn đề; false nếu bị mờ, mất trang, cắt xén hoặc thiếu hình vẽ then chốt.
6. note: Lời nhắn hoặc cảnh báo nếu tệp có vấn đề.`,
          },
        ],
      };
    }

    const response = await callGeminiWithFallback(ai, {
      contents: promptContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_PEDAGOGY,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formattedText: { type: Type.STRING },
            estimatedGrade: { type: Type.INTEGER },
            topic: { type: Type.STRING },
            topicLabel: { type: Type.STRING },
            isClear: { type: Type.BOOLEAN },
            note: { type: Type.STRING },
          },
          required: ['formattedText', 'estimatedGrade', 'topic', 'topicLabel', 'isClear'],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Không nhận được phản hồi từ AI');
    }

    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Lỗi phân tích tệp tin:', error);

    // Fallback: If Word extraction succeeded before AI call failed
    if (isDocx && rawDocxText && rawDocxText.trim().length > 0) {
      return res.json({
        formattedText: rawDocxText.trim(),
        estimatedGrade: 9,
        topic: 'algebra',
        topicLabel: 'Trích xuất từ tệp Word (.docx)',
        isClear: true,
        note: 'Đã trích xuất trực tiếp văn bản từ tệp Word. Bạn có thể kiểm tra và sửa lại trước khi bắt đầu học.',
      });
    }

    const errInfo = formatErrorMessage(error);
    res.status(errInfo.isRateLimit ? 429 : 500).json(errInfo);
  }
});

// API: OCR Math Problem from Image (kept for backward compatibility)
app.post('/api/math/ocr', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', gradeHint } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Thiếu dữ liệu ảnh base64' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Bạn có thể chọn Bài mẫu để trải nghiệm.',
        isConfigured: false,
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await callGeminiWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Bạn là chuyên gia số hóa đề thi và bài tập Toán Việt Nam.
Hãy đọc kỹ hình ảnh chứa đề toán này và trích xuất thông tin dưới dạng JSON chuẩn xác:
1. formattedText: Nội dung đề bài đầy đủ, chính xác, định dạng lại các ký hiệu toán học bằng LaTeX chuẩn ($...$ và $$...$$). Nếu có nhiều câu (a, b, c...) hãy giữ nguyên cấu trúc rõ ràng.
2. estimatedGrade: Dự đoán lớp học phù hợp (số nguyên từ 1 đến 12).${gradeHint ? ` Người dùng đang chọn lớp ${gradeHint}, hãy tham khảo.` : ''}
3. topic: Chủ đề toán học ('arithmetic' | 'algebra' | 'equations' | 'word_problems' | 'geometry' | 'statistics_probability' | 'other').
4. topicLabel: Tên tiếng Việt của chủ đề (VD: 'Đại số 9 - Căn thức', 'Hình học 9 - Tứ giác nội tiếp').
5. isClear: boolean, true nếu ảnh rõ nét và đọc được trọn vẹn đề; false nếu ảnh bị mờ, mất góc, cắt xén hoặc thiếu hình vẽ then chốt.
6. note: Lời nhắn hoặc cảnh báo nếu ảnh có vấn đề.`,
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_PEDAGOGY,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formattedText: { type: Type.STRING },
            estimatedGrade: { type: Type.INTEGER },
            topic: { type: Type.STRING },
            topicLabel: { type: Type.STRING },
            isClear: { type: Type.BOOLEAN },
            note: { type: Type.STRING },
          },
          required: ['formattedText', 'estimatedGrade', 'topic', 'topicLabel', 'isClear'],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Không nhận được phản hồi từ AI OCR');
    }

    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Lỗi OCR:', error);
    const errInfo = formatErrorMessage(error);
    res.status(errInfo.isRateLimit ? 429 : 500).json(errInfo);
  }
});

// API: Analyze Math Problem & Generate Socratic Step Plan
app.post('/api/math/analyze', async (req: Request, res: Response) => {
  try {
    const { problemText, grade = 9, topic, sampleId } = req.body;

    if (!problemText || problemText.trim().length < 3) {
      return res.status(400).json({ error: 'Vui lòng nhập đề toán hợp lệ.' });
    }

    // Check if sampleId matches demo analysis
    if (sampleId && DEMO_ANALYSES[sampleId]) {
      return res.json(DEMO_ANALYSES[sampleId]);
    }

    const ai = getGenAIClient();
    if (!ai) {
      // If no API key, check if text matches sample or return informative mock/error
      const foundDemoKey = Object.keys(DEMO_ANALYSES).find((key) =>
        problemText.toLowerCase().includes(DEMO_ANALYSES[key].summary.given[0]?.toLowerCase().slice(0, 15) || '___')
      );
      if (foundDemoKey) {
        return res.json(DEMO_ANALYSES[foundDemoKey]);
      }

      return res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng kiểm tra cài đặt Secrets của AI Studio hoặc chọn một trong các Bài mẫu có sẵn để trải nghiệm đầy đủ.',
        isDemo: true,
      });
    }

    const targetGrade = parseInt(String(grade), 10) || 9;
    const gradeRule = getGradePedagogicalGuidelines(targetGrade);

    const prompt = `
Bạn là chuyên gia thiết kế bài giảng Toán sư phạm chuẩn mực theo Chương trình GDPT 2018 của Bộ Giáo dục & Đào tạo Việt Nam.
BẠN PHẢI THIẾT KẾ BÀI HỌC VÀ CÁC BƯỚC GỢI MỞ CHI TIẾT DÀNH CHO HỌC SINH LỚP ${targetGrade}.

=== NGUYÊN TẮC GIỚI HẠN KIẾN THỨC BẮT BUỘC THEO KHỐI LỚP ===
${gradeRule}
LƯU Ý CỰC KỲ QUAN TRỌNG VỀ ĐÚNG KHỐI LỚP:
- BẮT BUỘC chỉ sử dụng các công thức, định lý, khái niệm và phương pháp giải ĐƯỢC PHÉP HỌC ở Lớp ${targetGrade}.
- TUYỆT ĐỐI KHÔNG đem kiến thức của các lớp trên (ví dụ không dùng định lý Viète hay hệ PT lớp 9 cho lớp 6, 7, 8; không dùng phương trình đại số x,y cho tiểu học) vào câu hỏi, các bước tư duy, gợi ý hay lời giải.
- Nếu đề bài gốc của người dùng vượt quá trình độ lớp ${targetGrade}, hãy tìm cách giải phù hợp nhất theo công cụ của lớp ${targetGrade} hoặc đưa ra hướng dẫn điều chỉnh ở phần validationIssue.

ĐỀ TOÁN CẦN PHÂN TÍCH:
"""
${problemText}
"""

CÁC YÊU CẦU THIẾT KẾ SƯ PHẠM CHI TIẾT (SOCRATIC PEDAGOGY):
1. Đánh giá tính đầy đủ của đề bài (isWellPosed). Nếu đề thiếu dữ kiện hoặc mâu thuẫn, đặt isWellPosed: false.
2. Tóm tắt đề bài chi tiết theo ngôn ngữ học sinh Lớp ${targetGrade}:
   - given: Giả thiết, điều kiện bài toán đã cho (dùng KaTeX đẹp mắt).
   - toFind: Yêu cầu cần tìm / chứng minh từng ý.
   - keyFormulas: CHỈ NÊU CÔNG THỨC TOÁN HỌC TỔNG QUÁT, ĐỊNH LÝ, QUY TẮC LÝ THUYẾT ĐÃ HỌC CỦA LỚP ${targetGrade} (Ví dụ: Công thức phần trăm $A_{mới} = A(1+r\%)$, Công thức năng suất, Định lý Viète $S = -b/a, P = c/a$, Định lý Pythagore $a^2+b^2=c^2$, Hằng đẳng thức). TUYỆT ĐỐI CẤM KHÔNG đưa phương trình cụ thể (như $x+y=3600, 1.15x+1.12y=4095$), KHÔNG đặt ẩn số cụ thể (như "Gọi x, y là..."), KHÔNG giải trước bài toán ở mục này!
   - strategyOverview: Sơ đồ tư duy chiến lược giải bằng lời văn khái quát (KHÔNG đưa ra phương trình cụ thể hay đáp số).
3. CHIA NHỎ THÀNH 4 - 6 BƯỚC SƯ PHẠM CHI TIẾT (Micro-steps):
   - Mọi thao tác đặt ẩn, thiết lập phương trình cụ thể, biến đổi trung gian và giải chi tiết BẮT BUỘC ĐƯỢC CHUYỂN VÀO CÁC BƯỚC NÀY.
   - TUYỆT ĐỐI KHÔNG hỏi chung chung. Mỗi bước phải là MỘT CÂU HỎI CỤ THỂ gắn liền với dữ kiện, biểu thức, hình vẽ hoặc công thức trung gian của bài toán.
   - Ví dụ các bước mẫu:
     * Bước 1: Nhận diện giả thiết, lập ĐKXĐ hoặc vẽ hình/xác định đại lượng.
     * Bước 2: Biến đổi trung gian bước 1 (phân tích đa thức thành nhân tử, quy đồng, lập phương trình 1...).
     * Bước 3: Biến đổi trung gian bước 2 (rút gọn biểu thức, thế/cộng đại số, liên kết góc...).
     * Bước 4: Tính toán kết quả trung gian hoặc giải phương trình/hệ phương trình.
     * Bước 5: Tìm đáp số cuối cùng, đối chiếu ĐKXĐ và rút ra kết luận.
   - QUY CHUẨN CÁC DẠNG CÂU HỎI TƯƠNG TÁC:
     * CÂU HỎI TRẮC NGHIỆM 4 PHƯƠNG ÁN (questionType: 'multiple_choice'):
       BẮT BUỘC PHẢI CÓ ĐÚNG 4 LỰA CHỌN với id lần lượt là: 'A', 'B', 'C', 'D'.
       Chính xác 1 lựa chọn isCorrect: true, 3 lựa chọn isCorrect: false.
       Mỗi phương án phải có explanation sư phạm phân tích cặn kẽ vì sao đúng hoặc chỉ rõ bẫy sai sót.
     * CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI HOẶC ĐÁNH GIÁ KHÁI NIỆM (questionType: 'concept_choice'):
       Cũng phải gồm ĐỦ 4 LỰA CHỌN / 4 MỆNH ĐỀ với id 'A', 'B', 'C', 'D' để học sinh phân tích toàn diện.
     * CÂU HỎI ĐIỀN KHUYẾT / TRẢ LỜI NGẮN (questionType: 'math_input'):
       Học sinh tự gõ kết quả số học hoặc biểu thức rút gọn; BẮT BUỘC cung cấp inputPlaceholder, expectedAnswerText, và mảng acceptableVariations phong phú (gồm nhiều cách viết tương đương: 'x > 3', 'x>3', 'x \\ge 0', v.v.).
   - BẮT BUỘC cung cấp 3 TẦNG TRỢ GIÚP CHI TIẾT cho mỗi bước:
     * hintTier1: Gợi ý tư duy nhẹ nhàng (định hướng học sinh quan sát điểm mấu chốt).
     * hintTier2: Manh mối công thức hoặc biểu thức trung gian cần áp dụng (có KaTeX).
     * deepExplanation: "Em chưa hiểu" - Lời thầy cô giảng giải cặn kẽ, tỉ mỉ từng bước biến đổi từ đầu đến cuối của bước này.
4. Lời giải chi tiết (fullSolution): Trình bày đầy đủ chuẩn mực tự luận từng bước, kèm cách thử lại (verification).
5. Củng cố kiến thức (reinforcement): Ghi nhớ vàng, 2-3 bẫy sai lầm hay gặp, và 1 bài tập tương tự có gợi ý + đáp số.
`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_PEDAGOGY,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formattedProblem: { type: Type.STRING, description: 'Đề bài định dạng đẹp với KaTeX' },
            grade: { type: Type.INTEGER },
            topic: { type: Type.STRING },
            topicLabel: { type: Type.STRING },
            isWellPosed: { type: Type.BOOLEAN },
            validationIssue: { type: Type.STRING },
            clarificationSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                given: { type: Type.ARRAY, items: { type: Type.STRING } },
                toFind: { type: Type.ARRAY, items: { type: Type.STRING } },
                keyFormulas: { type: Type.ARRAY, items: { type: Type.STRING } },
                strategyOverview: { type: Type.STRING },
              },
              required: ['given', 'toFind', 'keyFormulas', 'strategyOverview'],
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  goal: { type: Type.STRING },
                  question: { type: Type.STRING },
                  questionType: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                        isCorrect: { type: Type.BOOLEAN },
                        explanation: { type: Type.STRING },
                      },
                      required: ['id', 'text', 'isCorrect', 'explanation'],
                    },
                  },
                  expectedAnswerText: { type: Type.STRING },
                  acceptableVariations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  inputPlaceholder: { type: Type.STRING },
                  hintTier1: { type: Type.STRING },
                  hintTier2: { type: Type.STRING },
                  deepExplanation: { type: Type.STRING },
                  status: { type: Type.STRING },
                },
                required: [
                  'stepNumber',
                  'title',
                  'goal',
                  'question',
                  'questionType',
                  'hintTier1',
                  'hintTier2',
                  'deepExplanation',
                  'status',
                ],
              },
            },
            fullSolution: {
              type: Type.OBJECT,
              properties: {
                finalResult: { type: Type.STRING },
                detailedSteps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stepTitle: { type: Type.STRING },
                      stepDetail: { type: Type.STRING },
                    },
                    required: ['stepTitle', 'stepDetail'],
                  },
                },
                verification: { type: Type.STRING },
              },
              required: ['finalResult', 'detailedSteps', 'verification'],
            },
            reinforcement: {
              type: Type.OBJECT,
              properties: {
                keyTakeaway: { type: Type.STRING },
                commonPitfalls: { type: Type.ARRAY, items: { type: Type.STRING } },
                similarProblem: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    problem: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    answer: { type: Type.STRING },
                  },
                  required: ['title', 'problem', 'hint', 'answer'],
                },
              },
              required: ['keyTakeaway', 'commonPitfalls', 'similarProblem'],
            },
          },
          required: ['formattedProblem', 'grade', 'topic', 'topicLabel', 'isWellPosed', 'summary', 'steps', 'fullSolution', 'reinforcement'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    const result = {
      ...parsedData,
      id: 'analysis-' + Date.now(),
      rawInput: problemText,
      createdAt: Date.now(),
      isDemo: false,
    };

    // Ensure step 1 is active, others pending
    if (result.steps && result.steps.length > 0) {
      result.steps[0].status = 'active';
      result.steps[0].hintsUsed = 0;
      for (let i = 1; i < result.steps.length; i++) {
        result.steps[i].status = 'pending';
        result.steps[i].hintsUsed = 0;
      }
    }

    res.json(result);
  } catch (error: any) {
    try {
      const targetGrade = parseInt(String(req.body.grade), 10) || 9;
      const fallbackResult = generatePedagogicalFallbackAnalysis(req.body.problemText || '', targetGrade);
      return res.json(fallbackResult);
    } catch {
      const errInfo = formatErrorMessage(error);
      res.status(errInfo.isRateLimit ? 429 : 500).json(errInfo);
    }
  }
});

// API: Check Step Answer Adaptively & Accurately
app.post('/api/math/check-step', async (req: Request, res: Response) => {
  try {
    const { problemText, grade = 9, step, studentAnswer } = req.body;

    if (!step) {
      return res.status(400).json({ error: 'Thiếu dữ liệu bước học tập' });
    }

    if (!studentAnswer || String(studentAnswer).trim() === '') {
      return res.status(400).json({ error: 'Vui lòng cung cấp câu trả lời của bạn.' });
    }

    const answerStr = String(studentAnswer).trim();

    // 1. Multiple Choice Evaluation (Deterministic & 100% Reliable for all steps)
    if (step.options && Array.isArray(step.options) && step.options.length > 0) {
      // Find option by ID ('opt1', 'opt2', 'option_1', etc.)
      let matchedOption = step.options.find(
        (o: any) =>
          o.id === answerStr ||
          o.id.toLowerCase() === answerStr.toLowerCase() ||
          o.text.trim() === answerStr ||
          normalizeMathString(o.text) === normalizeMathString(answerStr)
      );

      // Check letter match (e.g. 'A', 'B', 'C', 'D' / 'a', 'b', 'c', 'd')
      if (!matchedOption) {
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const letterIdx = letters.indexOf(answerStr.toUpperCase());
        if (letterIdx >= 0 && step.options[letterIdx]) {
          matchedOption = step.options[letterIdx];
        }
      }

      // Check numeric index match ('0', '1', '2' or '1', '2', '3')
      if (!matchedOption && !isNaN(Number(answerStr))) {
        const numIdx = parseInt(answerStr, 10);
        if (numIdx >= 0 && numIdx < step.options.length) {
          matchedOption = step.options[numIdx];
        } else if (numIdx >= 1 && numIdx <= step.options.length) {
          matchedOption = step.options[numIdx - 1];
        }
      }

      if (matchedOption) {
        const isOptCorrect = matchedOption.isCorrect === true || matchedOption.isCorrect === 'true';
        return res.json({
          isCorrect: isOptCorrect,
          verdict: isOptCorrect ? 'correct' : 'incorrect',
          feedback:
            matchedOption.explanation ||
            (isOptCorrect
              ? 'Chính xác! Bạn đã chọn đúng phương án.'
              : 'Phương án này chưa chính xác, hãy đọc gợi ý để suy nghĩ lại nhé.'),
          encouragement: isOptCorrect
            ? 'Lập luận rất chuẩn xác! Hãy tiếp tục phát huy.'
            : 'Đừng nản lòng, hãy xem gợi ý để thử lại nhé!',
        });
      }
    }

    // 2. Mathematical Expression Normalization & Equivalence Check
    if (step.expectedAnswerText || (step.acceptableVariations && step.acceptableVariations.length > 0)) {
      const isEquivalent = areMathAnswersEquivalent(
        answerStr,
        step.expectedAnswerText || '',
        step.acceptableVariations
      );

      if (isEquivalent) {
        return res.json({
          isCorrect: true,
          verdict: 'correct',
          feedback: `Chính xác! Biểu thức "${answerStr}" hoàn toàn đúng về mặt toán học.`,
          encouragement: 'Bạn đã suy luận rất sắc bén!',
        });
      }
    }

    // 3. Fallback to Gemini AI for natural language reasoning / complex open answers
    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        isCorrect: true,
        verdict: 'correct',
        feedback: 'Bạn đã hoàn thành bước suy luận này!',
        encouragement: 'Hãy tiếp tục sang bước kế tiếp.',
        isDemo: true,
      });
    }

    const targetGrade = parseInt(String(grade), 10) || 9;
    const gradeRule = getGradePedagogicalGuidelines(targetGrade);

    const expectedDescription =
      step.expectedAnswerText ||
      step.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text).join(' HOẶC ') ||
      'Chuẩn toán học theo yêu cầu câu hỏi';

    const prompt = `
Bạn là giáo viên Toán đang trực tiếp chấm và nhận xét câu trả lời của học sinh Lớp ${targetGrade} theo Chương trình GDPT 2018.

=== QUY TẮC GIỚI HẠN KIẾN THỨC THEO LỚP ${targetGrade} ===
${gradeRule}

BỐI CẢNH BÀI TOÁN:
"""
${problemText}
"""

BƯỚC HIỆN TẠI (Bước ${step.stepNumber || 1}):
- Tiêu đề: ${step.title}
- Câu hỏi: ${step.question}
- Mục tiêu: ${step.goal}
- Đáp án mong đợi: ${expectedDescription}

CÂU TRẢ LỜI CỦA HỌC SINH:
"""
${answerStr}
"""

NGUYÊN TẮC CHẤM CHUẨN SƯ PHẠM:
1. ĐÁNH GIÁ BẢN CHẤT TOÁN HỌC: Học sinh có thể viết theo nhiều cách tương đương (ví dụ: x = 12 và y = 8; 12 và 8; 12h, 8h; 1/2 và 0.5; sqrt(x) và căn x; 3(sqrt(x)-3) và 3*sqrt(x)-9). Nếu ĐÚNG BẢN CHẤT hoặc TƯƠNG ĐƯƠNG TOÁN HỌC, BẮT BUỘC ĐÁNH GIÁ isCorrect: true. KHÔNG BẮT BẺ lỗi chính tả, khoảng trắng hoặc cách dùng dấu.
2. NHẬN XÉT ĐÚNG TẦM LỚP ${targetGrade}: Lời nhận xét và giải thích phải hoàn toàn phù hợp với trình độ học sinh Lớp ${targetGrade}.
3. verdict: 'correct' (Đúng) | 'partially_correct' (Đúng một phần) | 'incorrect' (Sai bản chất).
4. feedback: Nhận xét sư phạm ngắn gọn, ấm áp, giải thích rõ ràng.
5. encouragement: 1 câu khích lệ ngắn.
`;

    try {
      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_PEDAGOGY,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCorrect: { type: Type.BOOLEAN },
              verdict: { type: Type.STRING },
              feedback: { type: Type.STRING },
              encouragement: { type: Type.STRING },
            },
            required: ['isCorrect', 'verdict', 'feedback', 'encouragement'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (aiErr: any) {
      console.warn('AI check fallback on step evaluation:', aiErr?.message);
      // Graceful fallback so student can still continue when AI is rate limited
      return res.json({
        isCorrect: true,
        verdict: 'correct',
        feedback: 'Bạn đã hoàn thành bước suy luận này rất tốt! Hãy tiếp tục nhé.',
        encouragement: 'Tiến lên bước tiếp theo nào!',
      });
    }
  } catch (error: any) {
    console.error('Lỗi kiểm tra câu trả lời:', error);
    const errInfo = formatErrorMessage(error);
    res.status(errInfo.isRateLimit ? 429 : 500).json(errInfo);
  }
});

// API: Adaptive Hint Generator (Tier 1, Tier 2, Deep Explanation)
app.post('/api/math/hint', async (req: Request, res: Response) => {
  try {
    const { problemText, grade, step, hintTier, studentConfusion } = req.body;

    const ai = getGenAIClient();
    if (!ai) {
      if (hintTier === 1) return res.json({ hint: step.hintTier1 || 'Hãy quan sát kỹ giả thiết đã cho.' });
      if (hintTier === 2) return res.json({ hint: step.hintTier2 || 'Nhớ lại công thức liên quan.' });
      return res.json({ hint: step.deepExplanation || 'Hãy xem lại từng bước phân tích cơ bản.' });
    }

    const targetGrade = parseInt(String(grade), 10) || 9;
    const gradeRule = getGradePedagogicalGuidelines(targetGrade);

    const prompt = `
Bạn là giáo viên Toán GDPT 2018 đang hướng dẫn học sinh Lớp ${targetGrade}.
Học sinh đang bị mắc kẹt ở bước sau và yêu cầu gợi ý mức độ: Tầng ${hintTier} (1: Gợi ý nhẹ; 2: Gợi ý manh mối công thức; 3: "Em chưa hiểu" - Giải thích cặn kẽ).
Học sinh thắc mắc: "${studentConfusion || 'Em chưa biết bắt đầu từ đâu'}"

=== QUY TẮC PHƯƠNG PHÁP LỚP ${targetGrade} ===
${gradeRule}

Bài toán:
${problemText}

Bước hiện tại:
- Tiêu đề: ${step.title}
- Câu hỏi: ${step.question}
- Mục tiêu: ${step.goal}

Hãy đưa ra lời giải thích / gợi ý chuẩn mực theo mức độ ${hintTier}, ngắn gọn, dễ hiểu, TUYỆT ĐỐI chỉ dùng kiến thức của Lớp ${targetGrade}, dùng KaTeX nếu có công thức.
`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_PEDAGOGY,
      },
    });

    res.json({
      hint: response.text || step[`hintTier${hintTier}`] || 'Hãy kiên nhẫn xem lại từng bước nhé!',
    });
  } catch (error: any) {
    console.error('Lỗi tạo gợi ý:', error);
    const errInfo = formatErrorMessage(error);
    res.status(errInfo.isRateLimit ? 429 : 500).json(errInfo);
  }
});

// Mount Vite middleware for dev or static files for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TOAN TUNG BUOC] Server dang chay tren cong ${PORT}`);
  });
}

startServer();
